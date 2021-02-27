import { observable, computed, action } from 'mobx';
import { environment } from '#store/environment';
import { mappingFormats, dplcFormats } from '#formats/definitions';
import { extname } from 'path';

export class ObjectDef {
    constructor(parent, obj = void 0) {
        // if rehydrating...
        if (obj) {
            Object.assign(this, obj);
            // @deprecated
            if (this.mappings.format != 'Custom') {
                this.mappings.customDefinition = '';
            }
            if (this.dplcs.format != 'Custom') {
                this.dplcs.customDefinition = '';
            }
        }

        this.parent = parent;
    }

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
        format: 'Sonic 1',
        customDefinition: '', // @deprecated
        label: '',
    };
    @observable dplcs = {
        enabled: false,
        path: '',
        format: 'Sonic 1',
        customDefinition: '', // @deprecated
        label: '',
    };

    @computed get mappingsASM() {
        return extname(this.mappings.path) === '.asm';
    }

    @computed get dplcsASM() {
        return extname(this.dplcs.path) === '.asm';
    }

    @computed get linesLeft() {
        return this.palettes.reduce((a, c) => {
            return a - c.length;
        }, 4);
    }

    // @deprecated
    @computed get mappingDefinition() {
        const { format, customDefinition } = this.mappings;
        if (format == 'Custom') {
            return customDefinition;
        }
        else {
            return mappingFormats[format];
        }
    }
    // @deprecated
    @computed get dplcDefinition() {
        const { format, customDefinition } = this.dplcs;
        if (format == 'Custom') {
            return customDefinition;
        }
        else {
            return dplcFormats[format];
        }
    }

    // @deprecated
    @action load = (callback) => {
        environment.loadObject(this);
        callback();
    };

    // @deprecated
    @action save = (callback) => {
        environment.saveObject(this);
        callback();
    };

    @action remove = () => {
        const newList = this.parent.objects.filter((d) => d != this);
        this.parent.objects.replace(newList);
    };

}
