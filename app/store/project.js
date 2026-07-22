import { observable, autorun, action, makeObservable } from 'mobx';
import { ObjectDef } from '#store/objectdef';
import { promises, exists as fsExists } from 'fs';
import { promisify } from 'util';

const fs = promises;
const exists = promisify(fsExists);

function hydrate(objects) {
    objects && objects.forEach((obj) => {
        delete obj.uuid;
        if (obj.art) {
            obj.art.offset = obj.art.offset || 0;
        }
        obj.config ??= {};
        obj.children && hydrate(obj.children);
    });
}

export class Project {

    constructor(path) {
        makeObservable(this, {
            error: observable,
            name: observable,
            objects: observable,
            newFolder: action,
            newObject: action
        });

        (async () => {
            try {
                if (await exists(path)) {
                    const json = JSON.parse(await fs.readFile(path, 'utf8'));
                    this.name = json.name;
                    hydrate(json.objects);
                    this.objects.replace(json.objects || []);
                }

                this.cleanup = autorun(() => {
                    const json = JSON.stringify({
                        Flex: 2,
                        name: this.name,
                        objects: this.objects,
                    }, null, 4);
                    (async () => {
                        this.error = undefined;
                        try {
                            await fs.writeFile(path, json, 'utf8');
                        } catch (e) {
                            this.error = e;
                        }
                    })();
                });
            } catch (e) {
                this.error = e;
            }
        })();
    }

    error;
    name = '';
    objects = [];

    newFolder = () => {
        this.objects.unshift({
            name: 'folder',
            children: [],
            isDirectory: true,
            expanded: true,
        });
    };

    newObject = () => {
        const obj = new ObjectDef();
        this.objects.unshift(obj);
    };
}
