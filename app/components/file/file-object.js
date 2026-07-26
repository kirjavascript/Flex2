import React, { useState, useRef } from 'react';
import { observer } from 'mobx-react';
import { Item, Input, File as FileInput, Select, Checkbox, Button } from '#ui';
import { scripts, runScript, writeBIN, parseASMBasic } from '#formats/scripts';
import { assemble } from '#formats/asm';

import { decompress, compress, compressionFormats } from '#formats/compression';
import { bufferToTiles, tilesToBuffer } from '#formats/art';
import { buffersToColors, colorsToBuffers } from '#formats/palette';
import { environment } from '#store/environment';
import { workspace } from '#store/workspace';
import ErrorMsg from './error';
import SaveLoad from './save-load';
import { promises } from 'fs';
import { extname, basename } from 'path';
import { uuid } from '#util/uuid';

const fs = promises;
const compressionList = Object.keys(compressionFormats);

const isASM = (path) => ['.asm', '.s'].includes(extname(path));

export const FileObject = observer(({ obj, isAbsolute }) => {
    scripts.length; // react to script updates
    const script = obj.format && runScript(obj);

    const mappingsASM = isASM(obj.mappings.path);
    const dplcsASM = isASM(obj.dplcs.path);
    const linesLeft = obj.palettes.reduce((a, c) => a - c.length, 4);

    const toggleDPLCs = () => (obj.dplcs.enabled = !obj.dplcs.enabled);

    function ioWrap(filePath, setError, e, cb) {
        setError();
        if (script && !script.error && filePath) {
            const done = SaveLoad.indicator(e);
            requestIdleCallback(async () => {
                try {
                    await cb(workspace.fuzzyAbsolutePath(filePath));
                } catch (e) {
                    setError(e);
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

    function loadArt(e) {
        ioWrap(obj.art.path, setArtError, e, async (path) => {
            const buffer = (await fs.readFile(path)).slice(obj.art.offset || 0);

            const decompBuffer = await decompress(buffer, obj.art.compression);
            environment.tiles.replace(bufferToTiles(decompBuffer));
        });
    }

    function saveArt(e) {
        ioWrap(obj.art.path, setArtError, e, async (path) => {
            if (Number(obj.art.offset)) {
                throw new Error('Can only save art at offset 0');
            }
            const tiles = tilesToBuffer(environment.tiles, obj.art.compression);
            await fs.writeFile(path, tiles);

            const buffer = tilesToBuffer(environment.tiles);
            await fs.writeFile(
                path,
                Buffer.from(await compress(buffer, obj.art.compression)),
            );
        });
    }

    const [mappingError, setMappingError] = useState();

    function loadMappingsAndDPLCs(e) {
        ioWrap(obj.mappings.path, setMappingError, e, async (path) => {
            if (!obj.dplcs.enabled) environment.config.dplcsEnabled = false;
            const { buffer, symbols } = await getBuffer(path, mappingsASM);

            let dplcBuffer;
            if (obj.dplcs.enabled) {
                environment.config.dplcsEnabled = true;
                const dplcPath = workspace.fuzzyAbsolutePath(obj.dplcs.path);
                ({ buffer: dplcBuffer } = await getBuffer(dplcPath, dplcsASM));
            }

            const result = script.readMappings(buffer, symbols, dplcBuffer);
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
            const dplcsData = obj.dplcs.enabled ? environment.dplcs : null;
            const result = script.writeMappings(environment.mappings, dplcsData, environment.spriteMetadata, environment);
            if (result.error) throw result.error;

            if (!mappingsASM) {
                await fs.writeFile(path, writeBIN(result.mappings));
            } else {
                const label = obj.mappings.label || 'Map_' + uuid().slice(0, 4);
                const asmOutput = script.generateMappingsASM({
                    label,
                    listing: result.mappings,
                    sprites: environment.sprites,
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
                        sprites: environment.sprites,
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
                />
            </div>
            <div className="menu-item">
                <Item>Load Offset</Item>
                <Input store={obj.art} accessor="offset" isNumber />
            </div>
            <ErrorMsg error={artError} />
            <FileInput
                label="Art"
                store={obj.art}
                accessor="path"
                absolute={isAbsolute}
            />

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
                    <div className="menu-item" onClick={toggleDPLCs}>
                        <Item>Use PLCs</Item>
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
