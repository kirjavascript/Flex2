import React from 'react';
import { observer } from 'mobx-react';
import { workspace } from '#store/workspace';
import { selection } from '#store/selection';
import { FileObject } from '#components/file/file-object';
import ErrorMsg from '#components/file/error';
import { File as FileInput, Button, Item, Input } from '#ui';
import SortableTree from 'react-sortable-tree';
import { basename } from 'path';
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
                    absolute
                />
                {workspace.recentProjects.length > 0 && (
                    <div className="recent-projects">
                        <Item>Recent Projects</Item>
                        {workspace.recentProjects.map((p) => (
                            <div
                                key={p}
                                className="recent-entry"
                                onClick={() => {
                                    workspace.projectPath = p;
                                    requestAnimationFrame(workspace.openProject);
                                }}
                            >
                                {basename(p)}
                                <span className="recent-path">{p}</span>
                            </div>
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
                            : [<div className="object">OBJ</div>],
                    })}
                />
            </div>

            <div className="config">
                <div className="config-data">
                    <div className="menu-item">
                        <Item>Project</Item>
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
                {node && <FileObject obj={node} isAsbolute={false} />}
            </div>
        </div>
    );
});

export { Project };
