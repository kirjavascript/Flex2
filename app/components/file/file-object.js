import React, { useState, useRef } from 'react';
import { observer } from 'mobx-react';
import { toJS } from 'mobx';
import { Item, Input, File as FileInput, Select, Checkbox, Button } from '~/ui';
import { scripts, runScript, writeBIN } from '~/formats/scripts';
import { assemble } from '~/formats/asm';

import { decompress, compress, compressionFormats } from '~/formats/compression';
import { bufferToTiles, tilesToBuffer } from '~/formats/art';
import {
    artSources,
    sameTiles,
    validateArtSources,
} from '~/formats/art-sources';
import { buffersToColors, colorsToBuffers } from '~/formats/palette';
import { environment } from '~/store/environment';
import { workspace } from '~/store/workspace';
import { toggleDPLCs as mappingStateToggleDPLCs } from '~/components/mappings/state/toggle-dplcs';
import ErrorMsg from './error';
import SaveLoad from './save-load';
import { promises } from 'fs';
import { extname, basename } from 'path';
import { uuid } from '~/util/uuid';

const fs = promises;
const compressionList = Object.keys(compressionFormats);

const isASM = (path) => ['.asm', '.s'].includes(extname(path).toLowerCase());

export const FileObject = observer(({ obj, isInProject = false }) => {
    scripts.length; // react to script updates
    const script = obj.format && runScript(obj);

    const isAbsolute = !isInProject;

    const mappingsASM = isASM(obj.mappings.path);
    const dplcsASM = isASM(obj.dplcs.path);
    const linesLeft = obj.palettes.reduce((a, c) => a - c.length, 4);

    const toggleObjectDPLCs = () => (obj.dplcs.enabled = !obj.dplcs.enabled);

    function ioWrap(filePath, setError, e, cb) {
        setError();
        if (script && !script.error && filePath) {
            const done = SaveLoad.indicator(e);
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

    async function getBuffer(path, isASM) {
        if (isASM) {
            const contents = await fs.readFile(path, 'utf8');

            const result = await assemble(script.asm.prelude + contents, {
                filename: basename(path),
            });

            return result;
        }

        return { buffer: await fs.readFile(path), symbols: null };
    }

    const loadRef = useRef();

    function loadObject() {
        loadRef.current.childNodes.forEach((n) => {
            n.textContent = '';
        });
        loadArt({ target: loadRef.current.childNodes[0] });
        loadMappingsAndDPLCs({ target: loadRef.current.childNodes[1] });
        loadPalettes({ target: loadRef.current.childNodes[2] });
    }

    function saveObject() {
        loadRef.current.childNodes.forEach((n) => {
            n.textContent = '';
        });
        saveArt({ target: loadRef.current.childNodes[0] });
        saveMappingsAndDPLCs({ target: loadRef.current.childNodes[1] });
        savePalettes({ target: loadRef.current.childNodes[2] });
    }

    const [artError, setArtError] = useState();
    // one extra art source open at a time, the rest stay as summary rows
    const [openArt, setOpenArt] = useState(-1);

    // the first bank always starts at tile 0, the rest at their own address
    const sourceAddress = (source, fallback) => {
        const address = source.address === '' || source.address == null
            ? NaN
            : Number(source.address);
        return Number.isFinite(address) ? address : fallback;
    };

    function loadArt(e) {
        ioWrap(obj.art.path, setArtError, e, async () => {
            validateArtSources(obj.art);

            // one bank per file, holding its own tiles at its own address
            const banks = [];
            let end = 0;

            for (const source of artSources(obj.art)) {
                if (!source.path) continue;
                const path = workspace.fuzzyAbsolutePath(source.path);
                // only the primary art can start part way into its file
                const offset = source.extraIndex < 0 ? Number(source.offset) || 0 : 0;
                const buffer = (await fs.readFile(path)).slice(offset);
                const decompBuffer = await decompress(buffer, source.compression);

                const address = sourceAddress(source, end);
                // an unset address is pinned to where the file landed this load
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

    const [mappingError, setMappingError] = useState();

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

    const [paletteError, setPaletteError] = useState();

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

    return (
        <div className="file-object">
            <div className="menu-item">
                <Item>Game Format</Item>
                <Select options={scripts} store={obj} accessor="format" />
            </div>
            {script && <ErrorMsg error={script.error} />}
            <div className="menu-item">
                <Item color="blue">Object</Item>
                <div className="load-ref">
                    <div ref={loadRef}>
                        {Array.from({ length: 3 }, (_, i) => (
                            <span key={i} />
                        ))}
                    </div>
                    <SaveLoad load={loadObject} save={saveObject}></SaveLoad>
                </div>
            </div>
            <div className="menu-item">
                <Item color="green">Art</Item>
                <SaveLoad load={loadArt} save={saveArt} />
            </div>
            <div className="menu-item">
                <Item>Compression</Item>
                <Select
                    options={compressionList}
                    store={obj.art}
                    accessor="compression"
                    wheel={false}
                />
            </div>
            {!isInProject &&
            <div className="menu-item">
                <Item>Load Offset</Item>
                <Input store={obj.art} accessor="offset" isNumber wheel={false} />
            </div>}

            <ErrorMsg error={artError} />
            <FileInput
                label="Art"
                store={obj.art}
                accessor="path"
                absolute={isAbsolute}
            />

            <div className="menu-item">
                <Item color="green">Extra Art</Item>
                <Button
                    onClick={() => {
                        if (!obj.art.extra) obj.art.extra = [];
                        obj.art.extra.push({
                            path: '',
                            compression: 'Uncompressed',
                            address: '',
                        });
                        setOpenArt(obj.art.extra.length - 1);
                    }}
                >
                    add
                </Button>
            </div>

            {(obj.art.extra || []).map((source, i) => (
                <div key={i} className="art-source">
                    <div className="menu-item">
                        <Item
                            className="item art-summary"
                            prefix={openArt === i ? '\u25BE\u2002' : '\u25B8\u2002'}
                            onClick={() => setOpenArt(openArt === i ? -1 : i)}
                        >
                            {basename(source.path) || 'no file'}
                            <span className="art-numbers">
                                {source.address === '' || source.address == null
                                    ? ''
                                    : ` @${source.address}`}
                            </span>
                        </Item>
                        <Button
                            onClick={() => {
                                obj.art.extra.splice(i, 1);
                                setOpenArt(-1);
                            }}
                        >
                            remove
                        </Button>
                    </div>
                    {openArt === i && (
                        <div className="art-body">
                            <div className="menu-item">
                                <Item>Base Tile</Item>
                                <Input
                                    store={source}
                                    accessor="address"
                                    isNumber
                                    wheel={false}
                                />
                            </div>
                            <div className="menu-item">
                                <Item>Compression</Item>
                                <Select
                                    options={compressionList}
                                    store={source}
                                    accessor="compression"
                                    wheel={false}
                                />
                            </div>
                            <FileInput
                                label="Art"
                                store={source}
                                accessor="path"
                                absolute={isAbsolute}
                            />
                        </div>
                    )}
                </div>
            ))}

            <div className="menu-item">
                <Item color="yellow">Mappings</Item>
                <SaveLoad load={loadMappingsAndDPLCs} save={saveMappingsAndDPLCs} />
            </div>
            <ErrorMsg error={mappingError} />
            <FileInput
                label="Mappings"
                store={obj.mappings}
                accessor="path"
                absolute={isAbsolute}
            />
            {mappingsASM && (
                <div className="menu-item">
                    <Item>ASM Label</Item>
                    <Input store={obj.mappings} accessor="label" />
                </div>
            )}

            {script?.config?.map((option, i) => {
                return (
                    <div className="menu-item" key={i}>
                        <Item>{option.label || option.name}</Item>
                        {(() => {
                            if (option.type === 'number') {
                                return (
                                    <Input
                                        isNumber
                                        store={obj.config}
                                        accessor={option.name}
                                    />
                                );
                            }
                            if (option.type === 'select') {
                                return (
                                    <Select
                                        options={option.options}
                                        store={obj.config}
                                        accessor={option.name}
                                    />
                                );
                            }
                            if (option.type === 'checkbox') {
                                const value = !!obj.config[option.name];
                                return (
                                    <Checkbox
                                        checked={value}
                                        onChange={() => {
                                            obj.config[option.name] = !value;
                                        }}
                                    />
                                );
                            }
                        })()}
                    </div>
                );
            })}

            {script?.DPLCs && (
                <>
                    <div className="menu-item" onClick={toggleObjectDPLCs}>
                        <Item>Use DPLCs</Item>
                        <Checkbox checked={obj.dplcs.enabled} readOnly />
                    </div>
                    {obj.dplcs.enabled && (
                        <>
                            <FileInput
                                label="Mappings"
                                store={obj.dplcs}
                                accessor="path"
                                absolute={isAbsolute}
                            />
                            {dplcsASM && (
                                <div className="menu-item">
                                    <Item>ASM Label</Item>
                                    <Input store={obj.dplcs} accessor="label" />
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            <div className="menu-item">
                <Item color="magenta">Palettes</Item>
                <SaveLoad load={loadPalettes} save={savePalettes} />
            </div>
            <ErrorMsg error={paletteError} />
            {obj.palettes.map((palette, i) => {
                if (palette.blank) {
                    return (
                        <div key={i} className="menu-item">
                            <Item>Blank</Item>
                            <Button
                                color="red"
                                onClick={() => {
                                    obj.palettes.splice(i, 1);
                                }}
                            >
                                remove
                            </Button>
                        </div>
                    );
                }
                return (
                    <div key={i}>
                        <div className="menu-item">
                            <Item>Lines</Item>
                            <Select
                                options={[1, 2, 3, 4]}
                                store={palette}
                                accessor="length"
                                flipScroll
                            />
                        </div>
                        <FileInput
                            label="Palette"
                            store={palette}
                            accessor="path"
                            absolute={isAbsolute}
                        >
                            <div
                                className="dashed-box new"
                                onClick={() => {
                                    obj.palettes.splice(i, 1);
                                }}
                            >
                                remove
                            </div>
                        </FileInput>
                    </div>
                );
            })}

            {linesLeft > 0 && (
                <>
                    <FileInput
                        label="Palette"
                        onChange={(path) => {
                            obj.palettes.push({
                                path,
                                length: 1,
                            });
                        }}
                        absolute={isAbsolute}
                    >
                        <div
                            className="dashed-box new"
                            onClick={() => {
                                obj.palettes.push({
                                    length: 1,
                                    blank: true,
                                });
                            }}
                        >
                            use blank line
                        </div>
                    </FileInput>
                </>
            )}
        </div>
    );
});
