import React, { useState, useRef } from 'react';
import { observer } from 'mobx-react';
import { Item, Input, File as FileInput, Select, Checkbox, Button } from '#ui';
import { scripts, runScript, writeBIN, writeASM, parseASMBasic } from '#formats/scripts';
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

export const FileObject = observer(({ obj }) => {
    scripts.length; // react to script updates
    const script = obj.format && runScript(obj.format);
    const scriptSafe = script && !script.error;

    const { isAbsolute } = obj; // set in store/workspace

    const mappingsASM = isASM(obj.mappings.path);
    const dplcsASM = isASM(obj.dplcs.path);
    const linesLeft = obj.palettes.reduce((a, c) => a - c.length, 4);

    const toggleDPLCs = () => (obj.dplcs.enabled = !obj.dplcs.enabled);

    function ioWrap(filePath, setError, e, cb) {
        setError();
        if (scriptSafe && filePath) {
            const done = SaveLoad.indicator(e);
            requestIdleCallback(async () => {
                const path = isAbsolute
                    ? filePath
                    : workspace.absolutePath(filePath);
                try {
                    await cb(path);
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

            if (script.asm.basic) return await parseASMBasic(contents);

            const buffer = await assemble(script.asm.prelude + contents, {
                filename: basename(path),
            });

            return buffer;
        }

        return await fs.readFile(path);
    }

    const loadRef = useRef();

    function loadObject() {
        loadRef.current.childNodes.forEach(n => { n.textContent = ''; });
        loadArt({ target: loadRef.current.childNodes[0] });
        loadMappings({ target: loadRef.current.childNodes[1] });
        if (obj.dplcs.enabled) {
            loadDPLCs({ target: loadRef.current.childNodes[2] });
        }
        loadPalettes({ target: loadRef.current.childNodes[3] });
    }

    function saveObject() {
        loadRef.current.childNodes.forEach(n => { n.textContent = ''; });
        saveArt({ target: loadRef.current.childNodes[0] });
        saveMappings({ target: loadRef.current.childNodes[1] });
        if (obj.dplcs.enabled) {
            saveDPLCs({ target: loadRef.current.childNodes[2] });
        }
        savePalettes({ target: loadRef.current.childNodes[3] });
    }

    const [artError, setArtError] = useState();

    function loadArt(e) {
        ioWrap(obj.art.path, setArtError, e, async (path) => {
            const buffer = (await fs.readFile(path)).slice(obj.art.offset || 0);

            if (script.art) {
                environment.tiles.replace(script.readArt(buffer));
            } else {
                const decompBuffer = await decompress(
                    buffer,
                    obj.art.compression,
                );
                environment.tiles.replace(bufferToTiles(decompBuffer));
            }
        });
    }

    function saveArt(e) {
        ioWrap(obj.art.path, setArtError, e, async (path) => {
            if (obj.art.offset) {
                throw new Error('Can only save art at offset 0');
            }
            const tiles = script.art
                ? script.writeArt(tiles)
                : tilesToBuffer(environment.tiles, obj.art.compression);
            await fs.writeFile(path, tiles);

            if (script.art) {
                await fs.writeFile(path, script.writeArt(tiles));
            } else {
                const buffer = tilesToBuffer(environment.tiles);
                await fs.writeFile(
                    path,
                    Buffer.from(await compress(buffer, obj.art.compression)),
                );
            }
        });
    }

    const [mappingError, setMappingError] = useState();

    function loadMappings(e) {
        ioWrap(obj.mappings.path, setMappingError, e, async (path) => {
            if (!obj.dplcs.enabled) environment.config.dplcsEnabled = false;
            const buffer = await getBuffer(path, mappingsASM);

            const mappings = script.readMappings(buffer);
            if (mappings.error) throw mappings.error;
            environment.mappings.replace(mappings.sprites);
            if (
                obj.dplcs.enabled &&
                environment.dplcs.length < mappings.sprites.length
            ) {
                environment.dplcs.push(
                    ...Array.from(
                        {
                            length:
                                mappings.sprites.length -
                                environment.dplcs.length,
                        },
                        () => [],
                    ),
                );
            }
        });
    }

    function saveMappings(e) {
        ioWrap(obj.mappings.path, setMappingError, e, async (path) => {
            const mappings = script.writeMappings(environment.mappings);
            if (mappings.error) throw mappings.error;
            if (!mappingsASM) {
                await fs.writeFile(path, writeBIN(mappings));
            } else {
                const label = obj.mappings.label || 'Map_' + uuid().slice(0, 4);
                const asmOutput = script.generateMappingsASM({
                    label,
                    listing: mappings,
                    sprites: environment.sprites,
                });

                await fs.writeFile(path, asmOutput);
            }
        });
    }

    const [dplcError, setDPLCError] = useState();

    function loadDPLCs(e) {
        ioWrap(obj.dplcs.path, setDPLCError, e, async (path) => {
            environment.config.dplcsEnabled = true;
            const buffer = await getBuffer(path, dplcsASM);

            const dplcs = script.readDPLCs(buffer);
            if (dplcs.error) throw dplcs.error;
            environment.dplcs.replace(dplcs.sprites);
        });
    }

    function saveDPLCs(e) {
        ioWrap(obj.dplcs.path, setDPLCError, e, async (path) => {
            const dplcs = script.writeDPLCs(environment.dplcs);
            if (dplcs.error) throw dplcs.error;
            if (!dplcsASM) {
                await fs.writeFile(path, writeBIN(dplcs));
            } else {
                const label = obj.dplcs.label || 'DPLC_' + uuid().slice(0, 4);
                await fs.writeFile(path, writeASM(label, dplcs));
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
                const path = isAbsolute
                    ? palPath
                    : workspace.absolutePath(palPath);

                (script.palettes ? script.readPalettes : buffersToColors)({
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
                const path = isAbsolute
                    ? palPath
                    : workspace.absolutePath(palPath);

                const chunk = (
                    script.palettes ? script.writePalettes : colorsToBuffers
                )(environment.palettes, cursor, cursor + length);
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
                        {Array.from({ length: 4 }, (_, i) => (
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
            {!script.art && (
                <>
                    <div className="menu-item">
                        <Item>Compression</Item>
                        <Select
                            options={compressionList}
                            store={obj.art}
                            accessor="compression"
                        />
                    </div>
                    <div className="menu-item">
                        <Item>Offset</Item>
                        <Input store={obj.art} accessor="offset" isNumber />
                    </div>
                </>
            )}
            <ErrorMsg error={artError} />
            <FileInput
                label="Art"
                store={obj.art}
                accessor="path"
                absolute={isAbsolute}
            />

            <div className="menu-item">
                <Item color="yellow">Mappings</Item>
                <SaveLoad load={loadMappings} save={saveMappings} />
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

            {script.PLCs && (
                <>
                    <div className="menu-item" onClick={toggleDPLCs}>
                        <Item>DPLCs Enabled</Item>
                        <Checkbox checked={obj.dplcs.enabled} readOnly />
                    </div>
                    {obj.dplcs.enabled && (
                        <>
                            <div className="menu-item">
                                <Item color="red">DPLCs</Item>
                                <SaveLoad load={loadDPLCs} save={saveDPLCs} />
                            </div>
                            <ErrorMsg error={dplcError} />
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
