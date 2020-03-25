import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { ProjectExplorer } from './menu';
import { ProjectConfig } from './config';
import { workspace } from '#store/workspace';

@observer
export class Project extends Component {

    render() {
        if (!workspace.projectPath) {
            return <ProjectExplorer/>;
        } else {
            return <ProjectConfig/>;
        }
    }

}
