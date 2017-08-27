import { observable, computed, action, autorun, toJS } from 'mobx';

export class ObjectDef {
    constructor(parent, obj = void 0) {
        this.parent = parent;

        // if rehydrating...
        if (obj) {
            Object.assign(this, obj);
        }
        else {
            this.key = Math.random().toString(35).slice(2);
        }

    }

    @action remove = () => {
        const newList = this.parent.objects.filter((d) => d != this);
        this.parent.objects.replace(newList);
    };

}
