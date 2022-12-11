import { observable, makeObservable } from 'mobx';

export class ObjectDef {
    format = 'Sonic 1.js';

    name = 'object';
    palettes = [];
    art = {
        path: '',
        compression: 'Uncompressed',
        offset: 0,
    };
    mappings = {
        path: '',
        label: '',
    };
    dplcs = {
        enabled: false,
        path: '',
        label: '',
    };

    // turned into generic observables in project menu
    // dont add methods and shit because they wont work

    constructor() {
        makeObservable(this, {
            format: observable,
            name: observable,
            palettes: observable,
            art: observable,
            mappings: observable,
            dplcs: observable
        });
    }
}

export function editPaths(obj, lambda) {
    for (name in obj) {
        if (name === 'path') {
            obj[name] = lambda(obj[name]);
        } else {
            const item = obj[name];
            if (typeof item === 'object' && item !== null) {
                editPaths(item, lambda);
            }
        }
    }
}
