import { observable, toJS, action, makeObservable } from 'mobx';
import { storage } from './storage';
import { Project } from './project';
import { ObjectDef, editPaths } from  './objectdef';
import { selectTab } from '#components/layout/model';
import { selection } from '#store/selection';
import path from 'path';

const fileState = new ObjectDef();
storage(fileState, 'file-state');

class Workspace {
    file = fileState;

    projectPath = '';
    project;
    recentProjects = [];

    openProject = () => {
        this.closeProject();
        this.project = new Project(this.projectPath);
        const recent = Array.from(this.recentProjects || []).filter(p => p !== this.projectPath);
        recent.unshift(this.projectPath);
        this.recentProjects.replace(recent.slice(0, 10));
    };
    closeProject = () => {
        if (this.project) {
            this.project.cleanup?.();
            this.project = undefined;
            this.projectPath = '';
            selection.clear();
        }
    };

    relativePath = (filepath) => {
        return path.relative(path.dirname(this.projectPath), filepath);
    };
    absolutePath = (filepath) => {
        return path.resolve(path.dirname(this.projectPath), filepath);
    };
    fuzzyAbsolutePath = (filepath) => {
        return path.isAbsolute(filepath)
            ? filepath
            : this.absolutePath(filepath);
    };

    fileToProject = () => {
        if (this.project) {
            const clone = toJS(this.file);
            editPaths(clone, this.relativePath);
            clone.name = 'file object';
            delete clone.uuid;
            this.project.objects.unshift(clone);
            selection.select(this.project.objects[0]);
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
            recentProjects: observable,
            openProject: action,
            closeProject: action,
            relativePath: action,
            absolutePath: action,
            fuzzyAbsolutePath: action,
            fileToProject: action,
            projectToFile: action
        });
    }
}

const workspace = new Workspace();
storage(workspace, 'workspace', ['projectPath', 'recentProjects']);
if (!workspace.recentProjects) workspace.recentProjects = [];
if (workspace.projectPath) {
    workspace.openProject();
}
export { workspace };
