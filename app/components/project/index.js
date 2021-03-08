import React from 'react';
import { observer } from 'mobx-react';
import { workspace } from '#store/workspace';
import { FileObject } from '#components/file/file-object';
import { ObjectDef } from '#store/objectdef';
import { File as FileInput, Button, Item } from '#ui';
import SortableTree from 'react-sortable-tree';
import FileExplorerTheme from 'react-sortable-tree-theme-file-explorer';

const inspect = (d) => require('util').inspect(require('mobx').toJS(d));

const Config = observer(() => {
    return (
        <>
            {workspace.projectPath}
            <FileInput
                label="Project"
                store={workspace}
                accessor="projectPath"
                absolute
            />
        </>
    );
});


function toTree(objects, path = []) {
    return objects.map((obj, i) => {
        const nodePath = [...path, i];
        return {
            ...obj,
            ref: obj,
            path: nodePath,
            children: obj.children && toTree(obj.children, nodePath),
        };
    });
}

function fromTree(objects) {
    return objects.map((obj) => {
        const node = { ...obj };
        delete node.ref;
        delete node.path;
        if (obj.children) node.children = fromTree(obj.children);
        return node;
    });
}

const Project = observer(() => {
    const { project } = workspace;

    const newFolder = () => {
        project.objects.unshift({
            name: 'folder',
            children: [],
            isDirectory: true,
            expanded: true,
        });
    };

    const newObject = () => {
        project.objects.unshift(new ObjectDef());
    };

    const obj = {};

    return (
        <div className="project">
            <div className="tree">
                <div className="file-controls">
                    <Item>New</Item>
                    <Button color="blue" onClick={newObject}>object</Button>
                    <Button color="yellow" onClick={newFolder}>folder</Button>
                </div>
                <SortableTree
                    treeData={toTree(project.objects)}
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
                                          project.path.replace(rowInfo.node.path)
                                      }}
                                  >
                                      OBJ
                                  </div>,
                              ],
                        // TODO: dropdown
                        buttons: [<Button color="red">X</Button>],
                    })}
                />
            </div>

        {false && project.objects.length && (
            <FileObject obj={project.objects[0]} />
            )}
            {<pre style={{ width: 400 }}>{inspect(obj)}</pre>}
        </div>
    );
});

export { Project };
