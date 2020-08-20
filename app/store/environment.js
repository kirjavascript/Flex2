import { readFileSync, writeFileSync } from 'fs';
import { extname } from 'path';
import { observable, computed, action, autorun } from 'mobx';
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
import arrayMove from 'array-move';

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
            try {
                const buffer = readFileSync(artPath);
                this.tiles.replace(bufferToTiles(buffer, obj.art.compression));
            } catch(e) {
                errorMsg('Error Reading Art File', e.message);
            }
        }
        else {
            this.tiles.replace([]);
        }
        // load mappings
        if (obj.mappings.path) {
            const mappingPath = workspace.absolutePath(obj.mappings.path);
            const isAsm = extname(obj.mappings.path) == '.asm';
            try {
                const buffer = readFileSync(mappingPath);
                const newMappings = bufferToMappings(
                    isAsm ? asmToBin(buffer) : buffer,
                    obj.mappingDefinition,
                );
                this.mappings.replace(newMappings);

            } catch(e) {
                errorMsg('Error Reading Mapping File', e.message);
            }
        }
        else {
            this.mappings.replace([]);
        }
        // load DPLCs
        this.config.dplcsEnabled = obj.dplcs.enabled == true && obj.dplcs.path;
        if (this.config.dplcsEnabled && obj.dplcs.path) {
            const dplcPath = workspace.absolutePath(obj.dplcs.path);
            const isAsm = extname(obj.dplcs.path) == '.asm';
            try {
                const buffer = readFileSync(dplcPath);
                const newDPLCs = bufferToDPLCs(
                    isAsm ? asmToBin(buffer) : buffer,
                    obj.dplcDefinition,
                );
                this.dplcs.replace(newDPLCs);
            } catch(e) {
                errorMsg('Error Reading DPLC File', e.message);
            }
        }
        else {
            this.dplcs.replace([]);
        }

        try {
            const paletteBuffers = obj.palettes.map(({path, length}) => {
                const palettePath = workspace.absolutePath(path);
                return { buffer: readFileSync(palettePath), length };
            });

            buffersToColors(paletteBuffers)
                .forEach((line, i) => {
                    this.palettes[i] = line;
                });
        } catch(e) {
            errorMsg('Error Reading DPLC File', e.message);
        }
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
        try {
            writeFileSync(artPath, chunk);
        }
        catch (e) {
            errorMsg('Error Saving Art', e.message);
        }

        // palettes
        let lineIndex = 0;
        obj.palettes.forEach(({path, length}) => {
            const chunk = colorsToBuffers(this.palettes, lineIndex, lineIndex + length);
            lineIndex += length;

            try {
                writeFileSync(workspace.absolutePath(path), chunk);
            }
            catch (e) {
                errorMsg('Error Saving Palette', e.message);
            }
        });

        // mappings
        if (obj.mappings.path) {
            const mappingPath = workspace.absolutePath(obj.mappings.path);
            const isAsm = extname(obj.mappings.path) == '.asm';

            const { chunk, frames } = mappingsToBuffer(this.mappings, obj.mappingDefinition);
            const out = isAsm ? stuffToAsm(frames, obj.mappings.label, true) : chunk;
            try {
                writeFileSync(mappingPath, out);
            }
            catch (e) {
                errorMsg('Error Saving Mappings', e.message);
            }
        }

        // dplcs
        if (obj.dplcs.enabled && obj.dplcs.path) {
            const dplcPath = workspace.absolutePath(obj.dplcs.path);
            const isAsm = extname(obj.dplcs.path) == '.asm';

            const { chunk, frames } = DPLCsToBuffer(this.dplcs, obj.dplcDefinition);
            const out = isAsm ? stuffToAsm(frames, obj.dplcs.label) : chunk;
            try {
                writeFileSync(dplcPath, out);
            }
            catch (e) {
                errorMsg('Error Saving DPLCs', e.message);
            }
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
    } else if (config.currentSprite >= mappings.length) {
        config.currentSprite = mappings.length -1;
    }
});

initHistory();

export { environment };
