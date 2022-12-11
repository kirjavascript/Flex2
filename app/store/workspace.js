import { observable, toJS, action, makeObservable } from 'mobx';
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
    file = fileState;

    projectPath = '';
    project;

    openProject = () => {
        this.closeProject();
        this.project = new Project(this.projectPath);
    };
    closeProject = () => {
        if (this.project) {
            this.project.cleanup?.();
            this.project = undefined;
            this.projectPath = '';
        }
    };

    relativePath = (filepath) => {
        return path.relative(path.dirname(this.projectPath), filepath);
    };
    absolutePath = (filepath) => {
        return path.resolve(path.dirname(this.projectPath), filepath);
    };

    fileToProject = () => {
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

    projectToFile = (node) => {
        const clone = toJS(node);
        editPaths(clone, this.absolutePath);
        Object.assign(this.file, clone);
        selectTab('File');
    };

    constructor() {
        makeObservable(this, {
            file: observable,
            projectPath: observable,
            project: observable,
            openProject: action,
            closeProject: action,
            relativePath: action,
            absolutePath: action,
            fileToProject: action,
            projectToFile: action
        });
    }
}

const workspace = new Workspace();
storage(workspace, 'workspace', ['projectPath']);
if (workspace.projectPath) {
    workspace.openProject();
}
export { workspace };
