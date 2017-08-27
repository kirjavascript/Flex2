import { observable, computed, action, autorun, toJS } from 'mobx';

export class ObjectDef {

    @observable name = '';
    @observable art = {
        path: null,
        format: null,
    };
    @observable mappings = {
        path: null,
        format: null,
    };
    @observable dplcs = {
        enabled: false,
        path: '',
        format: null,
    };

    constructor(parent, obj = void 0) {
        // if rehydrating...
        if (obj) {
            Object.assign(this, obj);
        }
        else {
            this.key = Math.random().toString(35).slice(2);
        }

        this.parent = parent;
    }

    @action remove = () => {
        const newList = this.parent.objects.filter((d) => d != this);
        this.parent.objects.replace(newList);
    };

}
