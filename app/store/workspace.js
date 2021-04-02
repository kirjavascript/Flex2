import { observable, toJS, action } from 'mobx';
import { storage } from './storage';
import { Project } from './project';
import { ObjectDef, editPaths } from  './objectdef';
import { uuid } from '#util/uuid';
import { selectTab } from '#components/layout/model';
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
            this.project.cleanup?.();
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

    @action fileToProject = () => {
        if (this.project) {
            const clone = toJS(this.file);
            editPaths(clone, this.relativePath);
            clone.name = 'file object';
            clone.uuid = uuid();
            this.project.node = clone.uuid;
            this.project.objects.unshift(clone);
            selectTab('Project');
        }
    };

    @action projectToFile = (node) => {
        const clone = toJS(node);
        editPaths(clone, this.absolutePath);
        Object.assign(this.file, clone);
        selectTab('File');
    };
}

const workspace = new Workspace();
storage(workspace, 'workspace', ['projectPath']);
if (workspace.projectPath) {
    workspace.openProject();
}
export { workspace };
