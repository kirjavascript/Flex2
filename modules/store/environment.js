import { readFile } from 'fs';
import { observable, computed, action, autorun, toJS } from 'mobx';
import { storage } from './storage';
import { workspace } from '#store/workspace';
import { errorMsg } from '#util/dialog';
import { bufferToTiles } from '#formats/art';
import { bufferToMappings } from '#formats/mapping';

class Environment {

    @observable palettes = [
        // has to be a decimal representation of rrggbb values
        [[0,0,0],[0,0,0],[34,34,170],[34,68,204],[68,68,238],[102,102,238],[238,238,238],[170,170,170],[136,136,136],[68,68,68],[238,170,136],[170,102,68],[238,0,0],[136,0,0],[238,170,0],[238,136,0]],
        [[0,0,0],[34,0,34],[68,0,68],[102,0,102],[136,0,136],[170,0,170],[204,0,204],[238,0,238],[204,0,238],[170,0,204],[136,0,170],[102,0,136],[68,0,102],[34,0,68],[0,0,34],[238,0,0]],
        [[0,0,0],[34,34,0],[68,68,0],[102,102,0],[136,136,0],[170,170,0],[204,204,0],[238,238,0],[238,204,0],[204,170,0],[170,136,0],[136,102,0],[102,68,0],[68,34,0],[34,0,0],[0,238,0]],
        [[0,0,0],[0,34,34],[0,68,68],[0,102,102],[0,136,136],[0,170,170],[0,204,204],[0,238,238],[0,238,204],[0,204,170],[0,170,136],[0,136,102],[0,102,68],[0,68,34],[0,34,0],[0,0,238]],
    ];

    @observable tiles = [
        // each tile is a length 16 array of palette line indexes
    ];

    @observable mappings = [];

    @observable dplcs = [];

    @computed get palettesWeb() {
        return this.palettes.map((line) => {
            return line.map((color) => {
                return '#' + color.map((d) => d.toString(16).padStart(2, '0')).join``;
            });
        });
    }

    @action loadObject = (obj) => {
        // load art
        // const artPath = workspace.absolutePath(obj.art.path);
        // readFile(artPath, (err, buffer) => {
        //     if (err) return errorMsg('Error Reading Art File', err);
        //     this.tiles.replace(bufferToTiles(buffer));
        // });
        // load mappings
        const mappingPath = workspace.absolutePath(obj.mappings.path);
        readFile(mappingPath, (err, buffer) => {
            if (err) return errorMsg('Error Reading Mapping File', err);
            this.mappings.replace(bufferToMappings(buffer));
        });
    };

    @action saveObject = (obj) => {
        // this.tiles[0] = [
        //     3,3,3,3,3,3,3,3,
        //     3,3,3,3,3,3,3,3,
        //     3,3,3,3,3,3,3,3,
        //     3,3,3,3,3,3,3,3,
        //     3,3,3,3,3,3,3,3,
        //     3,3,3,3,3,3,3,3,
        //     3,3,3,3,3,3,3,3,
        //     3,3,3,3,3,3,3,3,
        // ];
        // this.palettes[0][0] = [0, 0, 0];
        // this.paletteRender();
    };

    @action paletteRender = (callback) => {
        // force a rerender
        callback && callback(this.palettes);
        this.palettes.replace(toJS(this.palettes));
    };

}


const environment = new Environment();
storage(environment, 'environment');
export { environment };
