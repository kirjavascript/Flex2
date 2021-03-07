import React, { useCallback, useState } from 'react';
import { observer } from 'mobx-react';
// import { ProjectExplorer } from './menu';
// import { ProjectConfig } from './config';
import { workspace } from '#store/workspace';
// import { project } from '#store/project';
import { FileObject } from '#components/file/file-object';

import { File as FileInput } from '#ui';

const getModel = (children) => ({
    'global': {
        'splitterSize': 6,
        'tabEnableClose': false,
        'tabEnableRename': false,
        'enableEdgeDock': false,
        'tabSetEnableDrag': false,
        'tabSetEnableDivide': false,
        'tabSetEnableMaximize': false
    },
    'borders': [
        {
	        "type": "border",
          "location":"top",
          "size": 300,
          "children": [
              {
              "type": "tab",
              "name": "Config",
              "component": "config"
              }
            ]
        },

    ],
    'layout': {
        'type': 'row',
        'children': [
            {
                'type': 'tabset',
                'children': children,
            },
        ],
    },
});

const inspect = d => require('util').inspect(require('mobx').toJS(d));

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
    return <div className="flexlayout__panel">
        <pre>
            {inspect(project.objects[component])}
        </pre>

        <FileObject obj={project.objects[component]} />
    </div>
});
import SortableTree, { changeNodeAtPath } from 'react-sortable-tree';
import FileExplorerTheme from 'react-sortable-tree-theme-file-explorer';

function toTree() {

}

function fromTree() {

}

const objSym = Symbol('objSym');

const Project = observer(() => {

    const { project } = workspace;

    // const [model, setModel] = useState(() => json));


    // tabs.unshift({
    //     name: 'Config',
    //     type: 'tab',
    //     component: 'config',
    //     enableDrag: false,
    // });

    const projectTree = project.objects.map(obj => ({
        // title: obj.name,
        ...obj,
    }));

    // have a project tab with the config with enableDrag: false,
const getNodeKey = ({ treeIndex }) => treeIndex;
// groups?
                        {/* <input */}
                        {/*     value={rowInfo.node.name} */}
                        {/*     onChange={event => { */}
                        {/*         rowInfo.node.name = event.target.value; */}
                        {/*     }} */}
                        {/* /> */}
    return (
        <div className="project">
            <div className="tree">
            <SortableTree
                treeData={[...project.objects]}
                onChange={(tree) => project.objects.replace(tree)}
                theme={FileExplorerTheme}
                canDrag={({ node }) => !node.dragDisabled}
                canDrop={({ nextParent }) => !nextParent || nextParent.isDirectory}
                canNodeHaveChildren={(node) => (console.log(node), node.isDirectory)}
                generateNodeProps={rowInfo => ({
                    title: (
                        <>
                            <label className="input-sizer">
                                <input value={rowInfo.node.name} onInput={e => {
                                    rowInfo.node.name = e.target.parentNode.dataset.value = e.target.value;
                                }} size={rowInfo.node.name.length}
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
                                    borderColor: rowInfo.node.expanded ? 'white' : 'gray',
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
                    buttons: [
                        <span
                        >
                            drag
                        </span>,
                    ],
                })}
            />
            </div>


                <button onClick={() => {

    project.objects.push({
        title: 'new folder',
        name: 'test',
        children: [],
        isDirectory: true,
        expanded: true,
    })

                }}>asd</button>
            {project.objects.length && <FileObject obj={project.objects[0]} />}
        </div>
    );
});

export { Project };
