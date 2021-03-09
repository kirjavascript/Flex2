import { observable } from 'mobx';

export class ObjectDef {
    @observable format = '';

    @observable name = '';
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
