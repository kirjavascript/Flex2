import { readFile, writeFile } from 'fs';
import { extname } from 'path';
import { observable, computed, action, autorun, toJS, spy } from 'mobx';
import range from 'lodash/range';
import unique from 'lodash/uniq';
import { storage } from './storage';
import { initHistory } from './history';
import { workspace } from '#store/workspace';
import { errorMsg } from '#util/dialog';
import { bufferToTiles, tilesToBuffer } from '#formats/art';
import { bufferToMappings, mappingsToBuffer } from '#formats/mapping';
import { bufferToDPLCs, DPLCsToBuffer } from '#formats/dplc';
import { buffersToColors, colorsToBuffers, defaultPalettes } from '#formats/palette';
import { asmToBin, stuffToAsm } from '#formats/asm';
import { arrayMove } from 'react-sortable-hoc';

class Environment {

    @observable config = {
        currentSprite: 0,
        currentTile: 0,
        transparency: true,
        dplcsEnabled: false,
    };

    // palettes must use colours of the form #NNN
    @observable palettes = defaultPalettes;

    @observable tiles = [
        // each tile is a length 16 array of palette line indexes
    ];

    @observable mappings = [
        // {art, top, left, priority, palette, hflip, vflip, width, height}
    ];

    @observable dplcs = [
        // {art, size}
    ];

    @computed get palettesRGB() {
        return this.palettes.map((palette) => (
            palette.map((color) => (
                color.slice(1).split``.map((d) => parseInt(`${d}${d}`, 16))
            ))
        ));
    }

    @computed get sprites() {
        return this.mappings.map((mappingList, index) => {
            let buffer = [];

            const dplcsAvailable = this.config.dplcsEnabled && this.dplcs.length > index;

            if (dplcsAvailable) {
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
                dplcs: dplcsAvailable && this.dplcs[index],
            };
        });
    }

    @computed get currentSprite() {
        return this.sprites[this.config.currentSprite]
            || this.sprites[0]
            || { mappings: [], buffer: [], index: 0, dplcs: [], };
    }

    @computed get activeTiles() {
        const { config: { dplcsEnabled }, currentSprite: { mappings, dplcs } } = environment;
        let activeTiles = [];

        const objs = (dplcsEnabled ? dplcs : mappings);

        if (!objs.length) return [];

        objs.forEach(({art, width, height, size}) => {
            activeTiles.push(...range(art, art + (size || width * height)));
        });

        return unique(activeTiles);
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
        this.config.dplcsEnabled = obj.dplcs.enabled == true && obj.dplcs.path;
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
        if (obj.dplcs.enabled && !this.config.dplcsEnabled) {
            return errorMsg('Error', 'DPLCs required for saving object');
        }
        else if (!obj.dplcs.enabled && this.config.dplcsEnabled) {
            return errorMsg('Error', 'Trying to save DPLCs with no file definition');
        }

        // art
        const artPath = workspace.absolutePath(obj.art.path);
        const chunk = tilesToBuffer(this.tiles, obj.art.compression);
        writeFile(artPath, chunk, (err, success) => {
            if (err) return errorMsg('Error Reading Mapping File', err);
        });

        // palettes
        let lineIndex = 0;
        obj.palettes.forEach(({path, length}) => {
            const chunk = colorsToBuffers(this.palettes, lineIndex, lineIndex + length);
            lineIndex += length;

            writeFile(workspace.absolutePath(path), chunk, (err, success) => {
                err && errorMsg('Error Saving Palette', err.message);
            });
        });

        // mappings
        if (obj.mappings.path) {
            const mappingPath = workspace.absolutePath(obj.mappings.path);
            const isAsm = extname(obj.mappings.path) == '.asm';

            const { chunk, frames } = mappingsToBuffer(this.mappings, obj.mappingDefinition);
            const out = isAsm ? stuffToAsm(frames, obj.mappings.label, true) : chunk;
            writeFile(mappingPath, out, (err, success) => {
                err && errorMsg('Error Saving Mappings', err.message);
            });
        }

        // dplcs
        if (obj.dplcs.enabled && obj.dplcs.path) {
            const dplcPath = workspace.absolutePath(obj.dplcs.path);
            const isAsm = extname(obj.dplcs.path) == '.asm';

            const { chunk, frames } = DPLCsToBuffer(this.dplcs, obj.dplcDefinition);
            const out = isAsm ? stuffToAsm(frames, obj.dplcs.label) : chunk;
            writeFile(dplcPath, out, (err, success) => {
                err && errorMsg('Error Saving DPLCs', err.message);
            });
        }

    };

    @action swapSprite = (oldIndex, newIndex) => {
        if (oldIndex != newIndex) {
            this.config.dplcsEnabled &&
            this.dplcs.replace(arrayMove(this.dplcs, oldIndex, newIndex));
            this.mappings.replace(arrayMove(this.mappings, oldIndex, newIndex));
        }
    };

    @action swapPalette = (oldIndex, newIndex) => {
        if (oldIndex != newIndex) {
            this.palettes.replace(arrayMove(this.palettes, oldIndex, newIndex));
        }
    };

    @action resetPalettes = () => {
        this.palettes.replace(defaultPalettes);
    };

    @action doAction = (callback) => { callback(this); };

}

const environment = new Environment();
storage(environment, 'environment');
window.env = environment;

autorun(() => {
    const { mappings, config } = environment;

    // force currentSprite to lie within bounds
    if (config.currentSprite < 0 || mappings.length == 0) {
        config.currentSprite = 0;
    }
    else if (config.currentSprite >= mappings.length) {
        config.currentSprite = mappings.length -1;
    }
});

initHistory();

export { environment };
