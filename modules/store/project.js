const { dialog } = require('electron').remote;
import { observable, computed, action, autorun, toJS } from 'mobx';
import { writeFile, readFile, stat } from 'fs';
import { stringify } from '#util/stringify';
import { workspace } from '#store/workspace';
import { ObjectDef } from '#store/objectdef';

let booted = false;

export class Project {

    @observable name = '';
    @observable objects = [];

    @action newObject = () => {
        this.objects.push(new ObjectDef(this, null));
    };

    @action reset = (name = '') => {
        this.name = name;
        this.objects.replace([]);
    }

    @action new = ({name, path}) => {
        this.reset(name);
        this.boot();
    };

    @action open = () => {
        readFile(
            workspace.projectPath,
            'utf8',
            (err, data) => {
                try {
                    if (err) {
                        throw err;
                    }
                    this.reset();
                    // rehydrate...
                    const projectData = JSON.parse(data);
                    this.name = projectData.name;
                    this.objects.replace(
                        projectData.objects.map((obj) => new ObjectDef(this, obj))
                    );
                    this.boot();
                }
                catch (e) {
                    workspace.projectPath = '';
                    dialog.showMessageBox({
                        type: 'error',
                        title: 'File Read Error',
                        message: e.message,
                        buttons: ['Ok'],
                    });
                }
            },
        );
    };

    // attach file writer
    @action boot = () => {
        if (!booted) {
            booted = true;
            autorun(() => {
                const data = stringify(project);

                if (workspace.projectPath) {
                    writeFile(
                        workspace.projectPath,
                        data,
                        (err) => {
                            err && dialog.showMessageBox({
                                type: 'error',
                                title: 'File Write Error',
                                message: err,
                                buttons: ['Ok'],
                            });
                        }
                    );
                }
            });
        }
    }

}

export const project = new Project();
