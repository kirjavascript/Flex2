import { observable, computed, action, autorun, toJS } from 'mobx';
import { writeFileSync, readFile, stat } from 'fs';
import { stringify } from '#util/stringify';
import { workspace } from '#store/workspace';
import { ObjectDef } from '#store/objectdef';
import { errorMsg } from '#util/dialog';

let booted = false;
let disableWrite = false;

export class Project {

    description = 'Flex 2 Project File';
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
        disableWrite = true;
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
                    errorMsg('File Read Error', e.message);
                }
                disableWrite = false;
            },
        );
    };

    // attach file writer
    @action boot = () => {
        if (!booted) {
            booted = true;
            autorun(() => {
                const data = stringify(project);

                if (workspace.projectPath && !disableWrite) {
                    // needs to be sync to ensure no data corruption
                    writeFileSync(
                        workspace.projectPath,
                        data,
                        (err) => {
                            err && errorMsg('File Write Error', err);
                        }
                    );
                }
            });
        }
    }

}

export const project = new Project();
