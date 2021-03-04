import React from 'react';
import { observer } from 'mobx-react';
// import { ProjectExplorer } from './menu';
// import { ProjectConfig } from './config';
import { workspace } from '#store/workspace';
import { project } from '#store/project';

const Project = observer(() => {
    return (
        <>
            {workspace.projectPath}
            <pre>{require('util').inspect(project.objects)}</pre>
        </>
    );
});

export { Project } ;
