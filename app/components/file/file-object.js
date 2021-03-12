import React, { useState, useRef } from 'react';
import { observer } from 'mobx-react';
import { Item, Input, File as FileInput, Select, Checkbox, Button } from '#ui';
import {
    scripts,
    runScript,
    parseASM,
    writeBIN,
    writeASM,
} from '#formats/scripts';
import { compressionFormats } from '#formats/compression';
import { bufferToTiles, tilesToBuffer } from '#formats/art';
import { buffersToColors, colorsToBuffers } from '#formats/palette';
import { environment } from '#store/environment';
import { workspace } from '#store/workspace';
import ErrorMsg from './error';
import SaveLoad from './save-load';
import { promises } from 'fs';
import { extname } from 'path';

const fs = promises;
const compressionList = Object.keys(compressionFormats);

export const FileObject = observer(({ obj }) => {
    scripts.length; // react to script updates

    const { isAbsolute } = obj; // set in store/workspace

    const mappingsASM = extname(obj.mappings.path) === '.asm';
    const dplcsASM = extname(obj.dplcs.path) === '.asm';
    const linesLeft = obj.palettes.reduce((a, c) => a - c.length, 4);

    const toggleDPLCs = () => (obj.dplcs.enabled = !obj.dplcs.enabled);

    const script = obj.format && runScript(obj.format);

    function ioWrap(filePath, setError, e, cb) {
        setError();
        if (script && !script.error && filePath) {
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

    const loadRef = useRef();

    function loadObject() {
        loadArt({ target: loadRef.current.childNodes[0] });
        loadMappings({ target: loadRef.current.childNodes[1] });
        if (obj.dplcs.enabled) {
            loadDPLCs({ target: loadRef.current.childNodes[2] });
        }
        loadPalettes({ target: loadRef.current.childNodes[3] });
    }

    function saveObject() {
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
            const tiles = bufferToTiles(buffer, obj.art.compression);
            environment.tiles.replace(tiles);
        });
    }

    function saveArt(e) {
        ioWrap(obj.art.path, setArtError, e, async (path) => {
            const tiles = tilesToBuffer(environment.tiles, obj.art.compression);
            await fs.writeFile(path, tiles);
        });
    }

    const [mappingError, setMappingError] = useState();

    function loadMappings(e) {
        ioWrap(obj.mappings.path, setMappingError, e, async (path) => {
            if (!obj.dplcs.enabled) environment.config.dplcsEnabled = false;
            const buffer = mappingsASM
                ? parseASM(await fs.readFile(path, 'utf8'))
                : await fs.readFile(path);

            const mappings = script.readMappings(buffer);
            if (mappings.error) throw mappings.error;
            environment.mappings.replace(mappings.sprites);
            if (
                obj.dplcs.enabled &&
                environment.dplcs.length < mappings.sprites.length
            ) {
                environment.dplcs.push(...Array.from({
                    length: mappings.sprites.length - environment.dplcs.length,
                }, () => []));
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
                const label =
                    obj.mappings.label || 'Mappings';
                await fs.writeFile(path, writeASM(label, mappings));
            }
        });
    }

    const [dplcError, setDPLCError] = useState();

    function loadDPLCs(e) {
        ioWrap(obj.dplcs.path, setDPLCError, e, async (path) => {
            environment.config.dplcsEnabled = true;
            const buffer = dplcsASM
                ? parseASM(await fs.readFile(path, 'utf8'))
                : await fs.readFile(path);

            const dplcs = script.readDPLCs(buffer);
            if (dplcs.error) throw dplcs.error;
            environment.dplcs.replace(dplcs.sprites);
        });
    }

    function saveDPLCs(e) {
        ioWrap(obj.dplcs.path, setMappingError, e, async (path) => {
            const dplcs = script.writeDPLCs(environment.dplcs);
            if (dplcs.error) throw dplcs.error;
            if (!dplcsASM) {
                await fs.writeFile(path, writeBIN(dplcs));
            } else {
                const label =
                    obj.dplcs.label || 'DPLCS';
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
                buffersToColors([
                    {
                        buffer: await fs.readFile(path),
                        length,
                    },
                ]).forEach((line) => {
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
                <Input store={obj.art} accessor="offset" />
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
