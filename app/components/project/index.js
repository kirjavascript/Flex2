import React from 'react';
import { observer } from 'mobx-react';
import { workspace } from '#store/workspace';
import { FileObject } from '#components/file/file-object';
import ErrorMsg from '#components/file/error';
import { File as FileInput, Button, Item } from '#ui';
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
        const node = { ...obj };
        delete node.ref;
        delete node.parent;
        if (obj.children) node.children = fromTree(obj.children);
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
                            workspace.openProject();
                        }
                    }}
                    ext="flex.json"
                    absolute
                />
            </div>
        );
    }

    const tree = toTree(project.objects);

    const node = project.nodeRef;

    return (
        <div className="project">
            <div className="tree">
                <div className="file-controls">
                    <Item>New</Item>
                    <Button color="blue" onClick={project.newObject}>
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
                        !nextParent || nextParent.isDirectory
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
                                    }}
                                    size={rowInfo.node.name.length}
                                    onChange={() => {}}
                                />
                            </label>
                        ),
                        onContextMenu: () => {
                            objectMenu(rowInfo.node);
                        },
                        onClick: () => {
                            if (!rowInfo.node.isDirectory) {
                                project.node = rowInfo.node.uuid;
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
                            {basename(workspace.projectPath)}
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
                            <span> {node.name} </span>
                        </div>
                    )}
                </div>
                {node && <FileObject obj={node} />}
            </div>
        </div>
    );
});

export { Project };
