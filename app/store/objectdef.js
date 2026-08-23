import { observable, makeObservable } from 'mobx';

export class ObjectDef {
    format = 'Sonic 1.js';

    name = 'object';
    palettes = [];
    art = {
        path: '',
        compression: 'Uncompressed',
        offset: 0,
        extra: [/* {path, compression, address} */],
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
    config = {};

    // turned into generic observables in project menu
    // needs to be serializable

    constructor() {
        makeObservable(this, {
            format: observable,
            name: observable,
            palettes: observable,
            art: observable,
            mappings: observable,
            dplcs: observable,
            config: observable
        });
    }
}

export function hydrate(objects) {
    objects && objects.forEach((obj) => {
        delete obj.uuid;
        if (obj.art) {
            obj.art.offset = obj.art.offset || 0;
            obj.art.extra ??= [];
        }
        obj.config ??= {};
        obj.children && hydrate(obj.children);
    });
}

export function editPaths(obj, lambda) {
    for (const name in obj) {
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
