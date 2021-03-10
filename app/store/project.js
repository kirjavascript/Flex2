import { observable, autorun, action } from 'mobx';
import { uuid } from '#util/uuid';
import { ObjectDef } from '#store/objectdef';
import { promises, exists as fsExists } from 'fs';
import { promisify } from 'util';

const fs = promises;
const exists = promisify(fsExists);

const addUuid = (objects) => objects && objects.forEach((obj) => {
    obj.uuid = obj.uuid || uuid();
    obj.children && addUuid(obj.children);
});

export class Project {

    constructor(path) {
        (async () => {
            this.error = undefined;
            try {
                if (await exists(path)) {
                    const json = JSON.parse(await fs.readFile(path, 'utf8'));
                    this.name = json.name;
                    this.node = json.node;
                    addUuid(json.objects);
                    this.objects.replace(json.objects || []);
                }

                this.cleanup = autorun(() => {
                    const json = JSON.stringify({
                        Flex: 2,
                        name: this.name,
                        node: this.node,
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

    @observable error;
    @observable name = '';
    @observable node = '';
    @observable objects = [];

    @action newFolder = () => {
        this.objects.unshift({
            name: 'folder',
            children: [],
            isDirectory: true,
            expanded: true,
        });
    };

    @action newObject = () => {
        const obj = new ObjectDef();
        obj.uuid = uuid();
        this.objects.unshift(obj);
    };
}
