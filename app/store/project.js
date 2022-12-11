import { observable, autorun, action, computed, toJS, makeObservable } from 'mobx';
import { uuid } from '#util/uuid';
import { ObjectDef } from '#store/objectdef';
import { promises, exists as fsExists } from 'fs';
import { promisify } from 'util';

const fs = promises;
const exists = promisify(fsExists);

function hydrate(objects) {
    // ensure objects have uuids and other backwards compat stuff
    objects && objects.forEach((obj) => {
        obj.uuid = obj.uuid || uuid();
        if (obj.art) {
            obj.art.offset = obj.art.offset || 0;
        }
        obj.children && hydrate(obj.children);
    });
}

function findNode(tree, uuid) {
    if (!uuid) return;
    for (let i = 0; i < tree.length; i++) {
        const item = tree[i];
        if (item.uuid === uuid) return item;
        if (item.children) {
            const result = findNode(item.children, uuid);
            if (result) return result;
        }
    }
}

export class Project {

    constructor(path) {
        makeObservable(this, {
            error: observable,
            name: observable,
            node: observable,
            objects: observable,
            nodeRef: computed,
            newFolder: action,
            newObject: action
        });

        (async () => {
            try {
                if (await exists(path)) {
                    const json = JSON.parse(await fs.readFile(path, 'utf8'));
                    this.name = json.name;
                    this.node = json.node;
                    hydrate(json.objects);
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

    error;
    name = '';
    node = '';
    objects = [];

    get nodeRef() {
        return findNode(this.objects, this.node);
    }

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
        obj.uuid = uuid();
        this.objects.unshift(obj);
    };
}
