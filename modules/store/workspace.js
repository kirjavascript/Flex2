import { observable, computed, action, autorun } from 'mobx';
import { storage } from './storage';
import { project } from './project';

class Workspace {
    @observable projectPath = '';

    @action newProject = ({name, path}) => {
        this.projectPath = path;
        project.new({name, path});
    };
    @action openProject = (path) => {
        if (path) { this.projectPath = path; }
        project.open();
    }
    @action closeProject = () => {
        this.projectPath = '';
    };
}

const workspace = new Workspace();
storage(workspace, 'workspace');
if (workspace.projectPath) {
    workspace.openProject();
}

export { workspace };
