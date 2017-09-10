import { observable, computed, action, autorun, toJS } from 'mobx';
import { environment } from '#store/environment';
import { mappingFormats, dplcFormats } from '#formats/definitions';

export class ObjectDef {

    @observable name = '';
    @observable art = {
        path: '',
        compression: 'Uncompressed',
    };
    @observable mappings = {
        path: '',
        format: 'Sonic 1',
        customDefinition: '',
    };
    @observable dplcs = {
        enabled: 'No',
        path: '',
        format: 'Sonic 1',
        customDefinition: '',
    };

    @computed get key() {
        return Math.random().toString(35).slice(2);
    }
    @computed get mappingDefinition() {
        const { format, customDefinition } = this.mappings;
        if (format == 'Custom') {
            return customDefinition;
        }
        else {
            return mappingFormats[format];
        }
    }
    @computed get dplcDefinition() {
        const { format, customDefinition } = this.dplcs;
        if (format == 'Custom') {
            return customDefinition;
        }
        else {
            return dplcFormats[format];
        }
    }

    constructor(parent, obj = void 0) {
        // if rehydrating...
        if (obj) {
            Object.assign(this, obj);
            if (this.mappings.format != 'Custom') {
                this.mappings.customDefinition = '';
            }
            if (this.dplcs.format != 'Custom') {
                this.dplcs.customDefinition = '';
            }
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
