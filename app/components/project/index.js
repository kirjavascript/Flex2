import React, { useCallback, useState } from 'react';
import { observer } from 'mobx-react';
// import { ProjectExplorer } from './menu';
// import { ProjectConfig } from './config';
import { workspace } from '#store/workspace';
import { project } from '#store/project';
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

const Project = observer(() => {

    const factory = useCallback((node) => {
        if (!node._visible) return false;
        return <div className="flexlayout__panel">
                {node.getComponent()}
            </div>
        ;

    }, []);

    // const [model, setModel] = useState(() => json));

    const tabs = project.objects.map(({ name }, i) => ({
        name,
        type: 'tab',
        component: i,
    }))

    const model = FlexLayout.Model.fromJson(getModel(tabs));

const inspect = d => require('util').inspect(require('mobx').toJS(d));

// groups?
    return (
        <>

            {workspace.projectPath}
            <pre>{inspect(project)}</pre>
            <FileInput
                label="Project"
                store={workspace}
                accessor="projectPath"
            />
            <div style={{display: 'none'}}>
                <FlexLayout.Layout
                    model={model}
                    factory={(node) => {
                        if (!node._visible) return false;
                        return <div className="flexlayout__panel">
                            <pre>
                                {inspect(project.objects[node.getComponent()])}
                            </pre>
                        </div>

                    }}
                    onModelChange={console.log}
                />
            </div>

        </>
    );
});

export { Project };
