import { toJS } from 'mobx';
import { assemble } from '~/formats/asm';
import { decompress, compress } from '~/formats/compression';
import { bufferToTiles, tilesToBuffer } from '~/formats/art';
import {
    artSources,
    sameTiles,
    validateArtSources,
} from '~/formats/art-sources';
import { buffersToColors, colorsToBuffers } from '~/formats/palette';
import { scripts, runScript, writeBIN } from '~/formats/scripts';
import { environment } from '~/store/environment';
import { workspace } from '~/store/workspace';
import { toggleDPLCs as mappingStateToggleDPLCs } from '~/components/mappings/state/toggle-dplcs';
import { promises } from 'fs';
import { extname, basename } from 'path';
import { uuid } from '~/util/uuid';
import SaveLoad from './save-load';

const fs = promises;
const noop = () => {};
const isASM = (path) => ['.asm', '.s'].includes(extname(path).toLowerCase());
const sourceAddress = (source, fallback) => {
    const address = source.address === '' || source.address == null
        ? NaN
        : Number(source.address);
    return Number.isFinite(address) ? address : fallback;
};

function getScript(obj) {
    scripts.length; // react to script updates when called from observers
    return obj.format && runScript(obj);
}

export function createObjectIO(obj, options = {}) {
    const script = 'script' in options ? options.script : getScript(obj);
    const {
        setArtError = noop,
        setMappingError = noop,
        setPaletteError = noop,
        targets: getTargets = () => [],
    } = options;

    const mappingsASM = isASM(obj.mappings.path);
    const dplcsASM = isASM(obj.dplcs.path);

    function targetFromEvent(e) {
        return e?.target || e;
    }

    function indicator(target) {
        return SaveLoad.indicator(target && { target });
    }

    function ioWrap(filePath, setError, e, cb) {
        const target = targetFromEvent(e);
        setError();
        if (script && !script.error && filePath) {
            const done = indicator(target);
            requestIdleCallback(async () => {
                try {
                    await cb(workspace.fuzzyAbsolutePath(filePath));
                } catch (e) {
                    setError(e);
                    console.error(e);
                } finally {
                    done();
                }
            });
        }
    }

    async function getBuffer(path, asm) {
        if (asm) {
            const contents = await fs.readFile(path, 'utf8');

            return assemble(script.asm.prelude + contents, {
                filename: basename(path),
            });
        }

        return { buffer: await fs.readFile(path), symbols: null };
    }

    function loadObject() {
        const targets = getTargets();
        targets.forEach((n) => {
            n.textContent = '';
        });
        loadArt(targets[0]);
        loadMappingsAndDPLCs(targets[1]);
        loadPalettes(targets[2]);
    }

    function saveObject() {
        const targets = getTargets();
        targets.forEach((n) => {
            n.textContent = '';
        });
        saveArt(targets[0]);
        saveMappingsAndDPLCs(targets[1]);
        savePalettes(targets[2]);
    }

    function loadArt(e) {
        ioWrap(obj.art.path, setArtError, e, async () => {
            validateArtSources(obj.art);

            const banks = [];
            let end = 0;

            for (const source of artSources(obj.art)) {
                if (!source.path) continue;
                const path = workspace.fuzzyAbsolutePath(source.path);
                const offset = source.extraIndex < 0 ? Number(source.offset) || 0 : 0;
                const buffer = (await fs.readFile(path)).slice(offset);
                const decompBuffer = await decompress(buffer, source.compression);

                const address = sourceAddress(source, end);
                if (source.extraIndex >= 0 && sourceAddress(source, null) === null) {
                    obj.art.extra[source.extraIndex].address = address;
                }

                const tiles = bufferToTiles(decompBuffer);
                banks.push({ address, tiles, enabled: true });
                end = Math.max(end, address + tiles.length);
            }

            environment.setArt(banks);
        });
    }

    function saveArt(e) {
        ioWrap(obj.art.path, setArtError, e, async () => {
            validateArtSources(obj.art);

            const writes = artSources(obj.art)
                .filter((source) => source.path)
                .map((source, i) => {
                    if (source.extraIndex < 0 && Number(source.offset)) {
                        throw new Error('Can only save art at offset 0');
                    }
                    const bank = environment.art[i];
                    if (!bank) {
                        throw new Error(
                            `${source.path} is not loaded, so there is no art to save for it`,
                        );
                    }
                    return {
                        source,
                        path: workspace.fuzzyAbsolutePath(source.path),
                        tiles: toJS(bank.tiles),
                    };
                });

            const byPath = new Map();
            for (const write of writes) {
                const seen = byPath.get(write.path);
                if (!seen) {
                    byPath.set(write.path, write);
                } else if (!sameTiles(seen.tiles, write.tiles)) {
                    throw new Error(
                        `${write.source.path} is loaded into more than one bank and `
                        + 'they no longer hold the same art, so it cannot be saved',
                    );
                }
            }

            for (const { source, path, tiles } of byPath.values()) {
                const buffer = tilesToBuffer(tiles);
                await fs.writeFile(
                    path,
                    Buffer.from(await compress(buffer, source.compression)),
                );
            }
        });
    }

    function loadMappingsAndDPLCs(e) {
        ioWrap(obj.mappings.path, setMappingError, e, async (path) => {
            const { buffer, symbols } = await getBuffer(path, mappingsASM);

            let dplcBuffer, dplcSymbols;

            environment.config.dplcsEnabled = obj.dplcs.enabled;

            if (obj.dplcs.enabled) {
                const dplcPath = workspace.fuzzyAbsolutePath(obj.dplcs.path);
                ({ buffer: dplcBuffer, symbols: dplcSymbols } = await getBuffer(dplcPath, dplcsASM));
            }

            const result = script.readMappings(buffer, symbols, dplcBuffer, dplcSymbols);
            if (result.error) throw result.error;

            environment.mappings.replace(result.mappings.sprites);
            environment.spriteMetadata.replace(result.mappings.spriteMetadata || []);

            if (result.dplcs) {
                environment.dplcs.replace(result.dplcs.sprites);
            }
        });
    }

    function saveMappingsAndDPLCs(e) {
        ioWrap(obj.mappings.path, setMappingError, e, async (path) => {
            if (
                (obj.dplcs.enabled && !environment.config.dplcsEnabled)
                || (!obj.dplcs.enabled && environment.config.dplcsEnabled)
            ) {
                mappingStateToggleDPLCs();
            }

            const dplcsData = obj.dplcs.enabled ? environment.dplcs : null;
            const sprites = environment.sprites;

            const result = script.writeMappings(environment.mappings, dplcsData, environment.spriteMetadata, environment);
            if (result.error) throw result.error;

            if (!mappingsASM) {
                await fs.writeFile(path, writeBIN(result.mappings));
            } else {
                const label = obj.mappings.label || 'Map_' + uuid().slice(0, 4);
                const asmOutput = script.generateMappingsASM({
                    label,
                    listing: result.mappings,
                    sprites,
                });

                await fs.writeFile(path, asmOutput);
            }

            if (result.dplcs) {
                const dplcPath = workspace.fuzzyAbsolutePath(obj.dplcs.path);
                if (!dplcsASM) {
                    await fs.writeFile(dplcPath, writeBIN(result.dplcs));
                } else {
                    const label = obj.dplcs.label || 'DPLC_' + uuid().slice(0, 4);
                    const asmOutput = script.generateDPLCsASM({
                        label,
                        listing: result.dplcs,
                        sprites,
                    });

                    await fs.writeFile(dplcPath, asmOutput);
                }
            }
        });
    }

    function loadPalettes(e) {
        ioWrap('dummy.bin', setPaletteError, e, async () => {
            let cursor = 0;
            for (let i = 0; i < obj.palettes.length; i++) {
                const { path: palPath, length, blank } = obj.palettes[i];
                if (!palPath || blank || cursor >= 4) {
                    cursor += length;
                    continue;
                }
                const path = workspace.fuzzyAbsolutePath(palPath);

                buffersToColors({
                    buffer: await fs.readFile(path),
                    length,
                }).forEach((line) => {
                    if (cursor < 4) {
                        environment.palettes[cursor] = line;
                        cursor++;
                    }
                });
            }
        });
    }

    function savePalettes(e) {
        ioWrap('dummy.bin', setPaletteError, e, async () => {
            let cursor = 0;
            for (let i = 0; i < obj.palettes.length; i++) {
                const { path: palPath, length, blank } = obj.palettes[i];
                if (!palPath || blank || cursor >= 4) {
                    cursor += length;
                    continue;
                }
                const path = workspace.fuzzyAbsolutePath(palPath);

                const chunk = colorsToBuffers(
                    environment.palettes,
                    cursor,
                    cursor + length,
                );
                await fs.writeFile(path, chunk);
                cursor += length;
            }
        });
    }

    return {
        loadObject,
        saveObject,
        loadArt,
        saveArt,
        loadMappingsAndDPLCs,
        saveMappingsAndDPLCs,
        loadPalettes,
        savePalettes,
    };
}
