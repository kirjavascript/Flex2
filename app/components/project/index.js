import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react';
import { workspace } from '~/store/workspace';
import { selection } from '~/store/selection';
import { FileObject } from '~/components/file/file-object';
import { createObjectIO } from '~/components/file/object-io';
import ErrorMsg from '~/components/file/error';
import { errorMsg } from '~/util/dialog';
import { File as FileInput, Button, Item, Input } from '~/ui';
import SortableTree from 'react-sortable-tree';
import { basename, dirname } from 'path';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import objectMenu from './object-menu';
import theme from './theme';

function toTree(objects) {
    return objects.map((obj) => {
        return {
            ...obj,
            ref: obj,
            parent: objects,
            children: obj.children && toTree(obj.children),
        };
    });
}

function fromTree(objects) {
    return objects.map((obj) => {
        const node = obj.ref || obj;
        node.expanded = obj.expanded;
        if (obj.children) node.children = fromTree(obj.children);
        else delete node.children;
        return node;
    });
}

const showLoadError = (section) => (error) => {
    if (error) {
        errorMsg(`Failed to load ${section}`, error.message || String(error));
    }
};

const RecentProject = ({ projectPath }) => {
    const [name, setName] = useState();
    const [gitRoot, setGitRoot] = useState();

    useEffect(() => {
        let cancelled = false;

        setName(undefined);
        setGitRoot(undefined);
        (async () => {
            try {
                const json = JSON.parse(await fs.readFile(projectPath, 'utf8'));
                if (!cancelled) setName(json.name);
            } catch (_e) {
                if (!cancelled) setName(undefined);
            }
        })();
        exec(
            'git rev-parse --show-toplevel',
            { cwd: dirname(projectPath) },
            (error, stdout) => {
                if (!cancelled && !error) setGitRoot(stdout.trim());
            }
        );

        return () => {
            cancelled = true;
        };
    }, [projectPath]);

    return (
        <div
            key={projectPath}
            className="recent-entry"
            onClick={() => {
                workspace.projectPath = projectPath;
                requestAnimationFrame(workspace.openProject);
            }}
        >
            <div className="recent-title">
                {name || basename(projectPath)}
                {gitRoot && <span className="recent-git">[{basename(gitRoot)}]</span>}
            </div>
            <span className="recent-path">{projectPath}</span>
        </div>
    );
};

const Project = observer(() => {
    const { project } = workspace;

    if (!project) {
        return (
            <div className="project-open">
                <FileInput
                    label="Project"
                    store={workspace}
                    accessor="projectPath"
                    onChange={(path) => {
                        if (path) {
                            // rAF avoids 'hover while not dragging' error
                            requestAnimationFrame(workspace.openProject);
                        }
                    }}
                    ext="flex.json"
                    filtername="Flex2 Project"
                    filterextensions={['json']}
                    absolute
                />
                {workspace.recentProjects.length > 0 && (
                    <div className="recent-projects">
                        <Item style={{ paddingBottom: '8px' }}><b>Recent Projects</b></Item>
                        {workspace.recentProjects.map((p) => (
                            <RecentProject key={p} projectPath={p} />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    const tree = toTree(project.objects);

    const node = selection.resolve(project.objects);

    return (
        <div className="project">
            <div className="tree">
                <div className="file-controls">
                    <Item>New</Item>
                    <Button color="blue" onClick={() => { project.newObject(); selection.select(project.objects[0]); }}>
                        object
                    </Button>
                    <Button color="yellow" onClick={project.newFolder}>
                        folder
                    </Button>
                </div>
                <SortableTree
                    treeData={tree}
                    onChange={(tree) => project.objects.replace(fromTree(tree))}
                    theme={theme}
                    canDrag={({ node }) => !node.dragDisabled}
                    canDrop={({ nextParent }) =>
                        (!nextParent || nextParent.isDirectory)
                    }
                    canNodeHaveChildren={(node) => node.isDirectory}
                    generateNodeProps={(rowInfo) => ({
                        title: (
                            <label className="input-sizer">
                                <input
                                    value={rowInfo.node.name}
                                    onInput={(e) => {
                                        rowInfo.node.ref.name =
                                            e.target.parentNode.dataset.value =
                                            e.target.value;
                                        if (rowInfo.node.ref === selection.ref) {
                                            selection.select(rowInfo.node.ref);
                                        }
                                    }}
                                    size={rowInfo.node.name.length}
                                    style={{ maxWidth: 160 }}
                                    onChange={() => {}}
                                />
                            </label>
                        ),
                        onContextMenu: () => {
                            objectMenu(rowInfo.node);
                        },
                        onClick: () => {
                            if (!rowInfo.node.isDirectory) {
                                selection.select(rowInfo.node.ref);
                            }
                        },
                        icons: rowInfo.node.isDirectory
                            ? [<div className="folder" />]
                            : [
                                <div
                                    className="object"
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        selection.select(rowInfo.node.ref);
                                        createObjectIO(rowInfo.node.ref, {
                                            setArtError: showLoadError('Art'),
                                            setMappingError: showLoadError('Mappings'),
                                            setPaletteError: showLoadError('Palettes'),
                                        }).loadObject();
                                    }}
                                >
                                    OBJ
                                </div>
                            ],
                    })}
                />
            </div>

            <div className="config">
                <div className="config-data">
                    <div className="menu-item">
                        <Item bold>Project</Item>
                        <span className="path">
                            {project.name || basename(workspace.projectPath)}
                        </span>
                        <Button
                            color="magenta"
                            onClick={workspace.closeProject}
                        >
                            close
                        </Button>
                    </div>
                    <ErrorMsg error={project.error} />
                    {node && (
                        <div className="menu-item">
                            <Item>Object Name</Item>
                            <Input store={node} accessor="name" />
                        </div>
                    )}
                </div>
                {node && <FileObject obj={node} isInProject />}
            </div>
        </div>
    );
});

export { Project };
