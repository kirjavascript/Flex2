import { readFile } from 'fs';
import { extname } from 'path';
import { observable, computed, action, autorun, toJS } from 'mobx';
import { storage } from './storage';
import { workspace } from '#store/workspace';
import { errorMsg } from '#util/dialog';
import { bufferToTiles } from '#formats/art';
import { bufferToMappings } from '#formats/mapping';
import { bufferToDPLCs } from '#formats/dplc';
import { buffersToColors } from '#formats/palette';
import { asmToBin } from '#formats/asm';
import { arrayMove } from 'react-sortable-hoc';

class Environment {

    @observable config = {
        currentSprite: 0,
        transparency: true,
        dplcsEnabled: false,
    };

    @observable palettes = [
        ['#000','#000','#22a','#24c','#44e','#66e','#eee','#aaa','#888','#444','#ea8','#a64','#e00','#800','#ea0','#e80'],
        ['#000','#202','#404','#606','#808','#a0a','#c0c','#e0e','#c0e','#a0c','#80a','#608','#406','#204','#002','#e00'],
        ['#000','#220','#440','#660','#880','#aa0','#cc0','#ee0','#ec0','#ca0','#a80','#860','#640','#420','#200','#0e0'],
        ['#000','#022','#044','#066','#088','#0aa','#0cc','#0ee','#0ec','#0ca','#0a8','#086','#064','#042','#020','#00e']
    ];

    @observable tiles = [
        // each tile is a length 16 array of palette line indexes
    ];

    @observable mappings = [];

    @observable dplcs = [];

    @computed get sprites() {
        return this.mappings.map((mappingList, index) => {
            let buffer = [];

            if (this.config.dplcsEnabled && this.dplcs.length > index) {
                this.dplcs[index].forEach(({art, size}) => {
                    Array.from({length: size}, (_, i) => {
                        if (this.tiles.length <= art + i) {
                            buffer.push([]);
                        }
                        else {
                            buffer.push(this.tiles[art + i]);
                        }
                    });
                });
            }
            else {
                buffer = this.tiles;
            }

            return {
                index, buffer,
                mappings: mappingList,
            };
        });
    }

    @computed get currentSprite() {
        return this.sprites[this.config.currentSprite] || this.sprites[0];
    }

    @action loadObject = (obj) => {
        // load art
        if (obj.art.path) {
            const artPath = workspace.absolutePath(obj.art.path);
            readFile(artPath, (err, buffer) => {
                if (err) return errorMsg('Error Reading Art File', err);
                this.tiles.replace(bufferToTiles(buffer, obj.art.compression));
            });
        }
        else {
            this.tiles.replace([]);
        }
        // load mappings
        if (obj.mappings.path) {
            const mappingPath = workspace.absolutePath(obj.mappings.path);
            const isAsm = extname(obj.mappings.path) == '.asm';
            readFile(mappingPath, (err, buffer) => {
                if (err) return errorMsg('Error Reading Mapping File', err);
                const newMappings = bufferToMappings(
                    isAsm ? asmToBin(buffer) : buffer,
                    obj.mappingDefinition,
                );
                this.mappings.replace(newMappings);
            });
        }
        else {
            this.mappings.replace([]);
        }
        // load DPLCs
        this.config.dplcsEnabled = obj.dplcs.enabled == true;
        if (this.config.dplcsEnabled && obj.dplcs.path) {
            const dplcPath = workspace.absolutePath(obj.dplcs.path);
            const isAsm = extname(obj.dplcs.path) == '.asm';
            readFile(dplcPath, (err, buffer) => {
                if (err) return errorMsg('Error Reading DPLC File', err);
                const newDPLCs = bufferToDPLCs(
                    isAsm ? asmToBin(buffer) : buffer,
                    obj.dplcDefinition,
                );
                this.dplcs.replace(newDPLCs);
            });
        }
        else {
            this.dplcs.replace([]);
        }

        // load palettes
        Promise
            .all(
                obj.palettes.map(({path, length}) => {
                    const palettePath = workspace.absolutePath(path);
                    return new Promise((resolve, reject) => {
                        readFile(palettePath, (err, buffer) => {
                            if (err) reject(err);
                            resolve({buffer, length});
                        });
                    });
                })
            )
            .then((all) => {
                buffersToColors(all)
                    .forEach((line, i) => {
                        this.palettes[i] = line;
                    });
            })
            .catch((err) => {
                errorMsg('Error Reading Palette File', err.message);
            });
    };

    @action saveObject = (obj) => {
        this.tiles[0] = [
            3,3,3,3,3,3,3,3,
            3,3,3,3,3,3,3,3,
            3,3,3,3,3,3,3,3,
            3,3,3,3,3,3,3,3,
            3,3,3,3,3,3,3,3,
            3,3,3,3,3,3,3,3,
            3,3,3,3,3,3,3,3,
            3,3,3,3,3,3,3,3,
        ];
    };

    @action swapSprite = (oldIndex, newIndex) => {
        this.config.dplcsEnabled &&
        this.dplcs.replace(arrayMove(this.dplcs, oldIndex, newIndex));
        this.mappings.replace(arrayMove(this.mappings, oldIndex, newIndex));
    };

    @action swapPalette = (oldIndex, newIndex) => {
        this.palettes.replace(arrayMove(this.palettes, oldIndex, newIndex));
    };

}

const environment = new Environment();
storage(environment, 'environment');
export { environment };
window.env = environment;
