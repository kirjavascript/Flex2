import { observable, computed, action, autorun } from 'mobx';
import { storage } from './storage';
import { Project } from './project';
import { ObjectDef } from  './objectdef';
import path from 'path';

const fileState = new ObjectDef();
fileState.isAbsolute = true;
storage(fileState, 'file-state');

class Workspace {

    @observable file = fileState;

    @observable projectPath = '';
    @observable project;

    @action openProject = () => {
        this.closeProject();
        this.project = new Project(this.projectPath);
    };
    @action closeProject = () => {
        if (this.project) {
            this.project.cleanup();
            this.project = undefined;
            this.projectPath = '';
        }
    };

    @action relativePath = (filepath) => {
        return path.relative(path.dirname(this.projectPath), filepath);
    };
    @action absolutePath = (filepath) => {
        return path.resolve(path.dirname(this.projectPath), filepath);
    };
}

const workspace = new Workspace();
storage(workspace, 'workspace', ['projectPath']);
if (workspace.projectPath) {
    workspace.openProject();
}
export { workspace };
