import { observable, computed, action, autorun, toJS } from 'mobx';
import { environment } from '#store/environment';
import { mappingFormats, dplcFormats } from '#formats/definitions';

export class ObjectDef {

    @observable name = '';
    @observable palettes = [];
    @observable art = {
        path: '',
        compression: 'Uncompressed',
    };
    @observable mappings = {
        path: '',
        format: 'Sonic 1',
        customDefinition: '',
        label: '',
    };
    @observable dplcs = {
        enabled: false,
        path: '',
        format: 'Sonic 1',
        customDefinition: '',
        label: '',
    };

    @computed get key() {
        return Math.random().toString(35).slice(2);
    }
    @computed get linesLeft() {
        return this.palettes.reduce((a, c) => {
            return a - c.length;
        }, 4);
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

    @action load = (callback) => {
        environment.loadObject(this);
        callback();
    };

    @action save = (callback) => {
        environment.saveObject(this);
        callback();
    };

    @action remove = () => {
        const newList = this.parent.objects.filter((d) => d != this);
        this.parent.objects.replace(newList);
    };

}
