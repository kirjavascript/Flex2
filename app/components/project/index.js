import React, { useCallback, useState } from 'react';
import { observer } from 'mobx-react';
// import { ProjectExplorer } from './menu';
// import { ProjectConfig } from './config';
import { workspace } from '#store/workspace';
// import { project } from '#store/project';
import FlexLayout from 'flexlayout-react';
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

const Project = observer(() => {

    const { project } = workspace;

    // const [model, setModel] = useState(() => json));

    const tabs = project.objects.map(({ name }, i) => ({
        name,
        type: 'tab',
        component: i,
    }))

    tabs.unshift({
        name: 'Config',
        type: 'tab',
        component: 'config',
        enableDrag: false,
    });

    const model = FlexLayout.Model.fromJson(getModel(tabs));

    const factory = useCallback((node) => {
        if (!node._visible) return false;
        return <Node node={node} />;
    }, []);

    // have a project tab with the config with enableDrag: false,

// groups?
    return (
        <div className="project">

            <div className="layout">
                <FlexLayout.Layout
                    model={model}
                    factory={factory}
                    onModelChange={console.log}
                />
            </div>
        </div>
    );
});

export { Project };
