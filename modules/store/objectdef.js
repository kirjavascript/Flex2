import { observable, computed, action, autorun, toJS } from 'mobx';

export class ObjectDef {

    @observable name = '';
    @observable art = {
        path: '',
        format: null,
    };
    @observable mappings = {
        path: '',
        format: null,
    };
    @observable dplcs = {
        enabled: false,
        path: '',
        format: null,
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

    @action remove = () => {
        const newList = this.parent.objects.filter((d) => d != this);
        this.parent.objects.replace(newList);
    };

}
