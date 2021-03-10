import React from 'react';
import { observer } from 'mobx-react';
import { workspace } from '#store/workspace';
import { FileObject } from '#components/file/file-object';
import ErrorMsg from '#components/file/error';
import { File as FileInput, Button, Item } from '#ui';
import SortableTree from 'react-sortable-tree';
import FileExplorerTheme from 'react-sortable-tree-theme-file-explorer';

function toTree(objects) {
    return objects.map((obj) => {
        return {
            ...obj,
            ref: obj,
            children: obj.children && toTree(obj.children),
        };
    });
}

function fromTree(objects) {
    return objects.map((obj) => {
        const node = { ...obj };
        delete node.ref;
        if (obj.children) node.children = fromTree(obj.children);
        return node;
    });
}

function findNode(tree, uuid) {
    if (!uuid) return;
    for (let i = 0; i < tree.length; i++) {
        const item = tree[i];
        if (item.uuid === uuid) return item;
        if (item.children) {
            const result = findNode(item.children, uuid);
            if (result) return result;
        }
    }
}

const Project = observer(() => {
    const { project } = workspace;

    if (!project) {
        return <div className="project-open">
            <FileInput
                label="Project"
                store={workspace}
                accessor="projectPath"
                onChange={path => {
                    if (path) {
                        workspace.openProject();
                    }
                }}
                ext="json"
                absolute
            />
        </div>;
    }

    const tree = toTree(project.objects)

    const node = findNode(tree, project.node);

    return (
        <div className="project">
            <ErrorMsg error={project.error} />
            <div className="tree">
                <div className="file-controls">
                    <Item>New</Item>
                    <Button color="blue" onClick={project.newObject}>object</Button>
                    <Button color="yellow" onClick={project.newFolder}>folder</Button>
                </div>
                <SortableTree
                    treeData={tree}
                    onChange={(tree) => project.objects.replace(fromTree(tree))}
                    theme={FileExplorerTheme}
                    canDrag={({ node }) => !node.dragDisabled}
                    canDrop={({ nextParent }) =>
                        !nextParent || nextParent.isDirectory
                    }
                    canNodeHaveChildren={(node) => node.isDirectory}
                    generateNodeProps={(rowInfo) => ({
                        // style
                        title: (
                            <>
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
                            </>
                        ),
                        icons: rowInfo.node.isDirectory
                            ? [
                                  <div
                                      style={{
                                          borderLeft: 'solid 8px gray',
                                          borderBottom: 'solid 10px gray',
                                          marginRight: 10,
                                          boxSizing: 'border-box',
                                          width: 16,
                                          height: 12,
                                          filter: rowInfo.node.expanded
                                              ? 'drop-shadow(1px 0 0 gray) drop-shadow(0 1px 0 gray) drop-shadow(0 -1px 0 gray) drop-shadow(-1px 0 0 gray)'
                                              : 'none',
                                          borderColor: rowInfo.node.expanded
                                              ? 'white'
                                              : 'gray',
                                      }}
                                  />,
                              ]
                            : [
                                  <div
                                      style={{
                                          border: 'solid 1px grey',
                                          fontSize: 7,
                                          textAlign: 'center',
                                          marginRight: 10,
                                          width: 14,
                                          height: 16,
                                      }}
                                      onClick={() => {
                                          project.node = rowInfo.node.uuid;
                                      }}
                                  >
                                      OBJ
                                  </div>,
                              ],
                        // TODO: dropdown
                        buttons: [''],
                    })}
                />
            </div>

            <div className="config">
                {node && <>
                    <div>
                        <Button color="magenta" onClick={workspace.closeProject}>close project</Button>
                        <Item>Project</Item>
                        {workspace.projectPath}
                    </div>
                        <span>{node.name}</span>
                    <FileObject obj={node} />
                </>}
            </div>
        </div>
    );
});

export { Project };
