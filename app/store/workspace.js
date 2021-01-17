import { observable, computed, action, autorun } from 'mobx';
import { storage } from './storage';
import { project } from './project';
import { ObjectDef } from  './objectdef';
import path from 'path';

const fileState = new ObjectDef();
storage(fileState, 'file-state');

class Workspace {

    @observable file = fileState;

    @observable projectPath = '';

    @action newProject = ({name, path}) => {
        this.projectPath = path;
        project.new({name, path});
    };
    @action openProject = (path) => {
        if (path) { this.projectPath = path; }
        project.open();
    };
    @action closeProject = () => {
        this.projectPath = '';
    };

    @action relativePath = (filepath) => {
        return path.relative(path.dirname(this.projectPath), filepath);
    };
    @action absolutePath = (filepath) => {
        return path.resolve(path.dirname(this.projectPath), filepath);
    };
}

const workspace = new Workspace();
storage(workspace, 'workspace');
if (workspace.projectPath) {
    workspace.openProject();
}
export { workspace };
