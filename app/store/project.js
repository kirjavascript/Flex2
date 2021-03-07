import { observable, autorun } from 'mobx';
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
                    this.name = json.name;
                    this.objects.replace(json.objects);
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
}
