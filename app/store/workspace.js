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

    @action newProject = (path) => {
        this.closeProject();

        this.projectPath = path;
        this.project = new Project(path);
        // this.projectPath = path;
        // project.new({name, path});
    };
    @action openProject = () => {
        // if (path) { this.projectPath = path; }
        // project.open();
        this.project = new Project(this.projectPath);
    };
    @action closeProject = () => {
        if (this.project) {
            this.projectPath = '';
            this.project.cleanup();
            this.project = undefined;
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
