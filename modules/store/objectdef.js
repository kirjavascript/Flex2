import { observable, computed, action, autorun, toJS } from 'mobx';
import { environment } from '#store/environment';

export class ObjectDef {

    @observable name = '';
    @observable art = {
        path: '',
        compression: 'Uncompressed',
    };
    @observable mappings = {
        path: '',
        format: 'Sonic 1',
    };
    @observable dplcs = {
        enabled: false,
        path: '',
        format: 'Sonic 1',
    };
    @computed get key() {
        return Math.random().toString(35).slice(2);
    }

    constructor(parent, obj = void 0) {
        // if rehydrating...
        if (obj) {
            Object.assign(this, obj);
        }

        this.parent = parent;
    }

    @action load = () => {
        environment.loadObject(this);
    };

    @action save = () => {
        environment.saveObject(this);
    };

    @action remove = () => {
        const newList = this.parent.objects.filter((d) => d != this);
        this.parent.objects.replace(newList);
    };

}
