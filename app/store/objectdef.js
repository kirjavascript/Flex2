import { observable, computed, action } from 'mobx';
import { extname } from 'path';

export class ObjectDef {
    constructor(parent, obj = void 0) {
        obj && Object.assign(this, obj);
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
        label: '',
    };
    @observable dplcs = {
        enabled: false,
        path: '',
        format: 'Sonic 1',
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

    @action remove = () => {
        const newList = this.parent.objects.filter((d) => d != this);
        this.parent.objects.replace(newList);
    };

}
