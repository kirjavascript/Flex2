import { observable } from 'mobx';

export class ObjectDef {
    @observable format = 'Sonic 1.js';

    @observable name = 'object';
    @observable palettes = [];
    @observable art = {
        path: '',
        compression: 'Uncompressed',
        offset: 0,
    };
    @observable mappings = {
        path: '',
        label: '',
    };
    @observable dplcs = {
        enabled: false,
        path: '',
        label: '',
    };

    // turned into generic observables in project menu
    // dont add methods and shit because they wont work
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
