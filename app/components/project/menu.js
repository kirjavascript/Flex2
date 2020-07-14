import React, { Component } from 'react';
import { observable, computed, action, autorun } from 'mobx';
import { observer } from 'mobx-react';
import { workspace } from '#store/workspace';
import pathTool from 'path';

const { dialog } = require('electron').remote;

@observer
export class ProjectExplorer extends Component {
    @observable menu = false;
    @observable newProjectName = '';

    newProject = () => {
        this.menu = 'new';
    };

    resetMenu = () => {
        this.menu = false;
    };

    updateProjectName = (e) => {
        this.newProjectName = e.target.value;
    };

    createNew = () => {
        dialog.showOpenDialog(
            {
                title: `Create Project '${this.newProjectName}'`,
                properties: ['openDirectory'],
            },
        )
            .then(({ filePaths: [path] }) => {
                if (path) {
                    workspace.newProject({
                        name: this.newProjectName,
                        path: pathTool.join(path, 'flex.json'),
                    });
                    this.newProjectName = '';
                    this.resetMenu();
                }
            })
            .catch(console.error);
    };

    openProject = () => {
        dialog.showOpenDialog(
            {
                title: 'Open Project',
                properties: ['openFile'],
                filters: [
                    { name: 'Flex 2 Project File', extensions: ['json'] },
                ],
            },
        )
            .then(({ filePaths: [path] }) => {
                if (path) {
                    workspace.openProject(path);
                }
            })
            .catch(console.error);
    };

    render() {
        return (
            <div className="project-menu">
                {this.menu === 'new' ? (
                    <div>
                        <input
                            type="text"
                            onChange={this.updateProjectName}
                            value={this.newProjectName}
                            placeholder="Project Name..."
                        />
                        {this.newProjectName && (
                            <div className="menu-item" onClick={this.createNew}>
                                Create '{this.newProjectName}'
                            </div>
                        )}
                        <div className="menu-item" onClick={this.resetMenu}>
                            Cancel
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="menu-item" onClick={this.newProject}>
                            New Project
                        </div>
                        <div className="menu-item" onClick={this.openProject}>
                            Open Project
                        </div>
                    </div>
                )}
            </div>
        );
    }
}
