import React, { useCallback, useState } from 'react';
import { observer } from 'mobx-react';
// import { ProjectExplorer } from './menu';
// import { ProjectConfig } from './config';
import { workspace } from '#store/workspace';
// import { project } from '#store/project';
import { FileObject } from '#components/file/file-object';

import { File as FileInput } from '#ui';

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

const Node = observer(({ node }) => {
    const { project } = workspace;
    const component = node.getComponent();
    if (component === 'config') return <Config />;
    return (
        <div className="flexlayout__panel">
            <pre>{inspect(project.objects[component])}</pre>

            <FileObject obj={project.objects[component]} />
        </div>
    );
});
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
        return {
            ...obj,
            ref: undefined,
            children: obj.children && fromTree(obj.children),
        };
    });
}

// make hydrating recursive

const Project = observer(() => {
    const { project } = workspace;

    return (
        <div className="project">
            <div className="tree">
                <SortableTree
                    treeData={toTree(project.objects)}
                    onChange={(tree) => project.objects.replace(fromTree(tree))}
                    theme={FileExplorerTheme}
                    canDrag={({ node }) => !node.dragDisabled}
                    canDrop={({ nextParent }) =>
                        !nextParent || nextParent.isDirectory
                    }
                    canNodeHaveChildren={(node) => (
                        console.log(node), node.isDirectory
                    )}
                    generateNodeProps={(rowInfo) => ({
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
                                  >
                                      OBJ
                                  </div>,
                              ],
                        buttons: [<span>drag</span>],
                    })}
                />
            </div>

            <button
                onClick={() => {
                    project.objects.push({
                        name: 'test',
                        children: [],
                        isDirectory: true,
                        expanded: true,
                    });
                }}
            >
                asd
            </button>
            {false && project.objects.length && (
                <FileObject obj={project.objects[0]} />
            )}
            <pre style={{ width: 400 }}>{inspect(project.objects)}</pre>
        </div>
    );
});

export { Project };
