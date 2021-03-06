import { observable, action, autorun } from 'mobx';
import { ObjectDef } from '#store/objectdef';
import { promises, exists as fsExists } from 'fs';
import { promisify } from 'util';

const fs = promises;
const exists = promisify(fsExists);

export class Project {

    constructor(path) {
        (async () => {
            this.error = undefined;
            try {
                if (await exists(path)) {
                    const json = JSON.parse(await fs.readFile(path, 'utf8'));
                    this.name = name;
                    this.objects.replace(
                        (json.objects || []).map((obj) => new ObjectDef(obj))
                    );
                }

                this.cleanup = autorun(() => {
                    const json = JSON.stringify({
                        Flex: 2,
                        name: this.name,
                        objects: this.objects,
                    }, null, 4);
                    (async () => {
                        this.error = undefined;
                        // try {
                        //     await fs.writeFile(path, json, 'utf8');
                        // } catch (e) {
                        //     this.error = e;
                        // }
                    })();
                });
            } catch (e) {
                this.error = e;
            }
        })();

    }

    @observable error;
    @observable name = '';
    @observable objects = [];


    @action addObj = () => {
        this.objects.push(new ObjectDef());
    };

}
