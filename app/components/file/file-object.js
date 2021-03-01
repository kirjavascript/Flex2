import React, { useState, useRef } from 'react';
import { observer } from 'mobx-react';
import { Item, Input, File as FileInput, Select, Checkbox, Button } from '#ui';
import { scripts, runScript, parseASM, writeBIN, writeASM } from '#formats/scripts';
import { compressionFormats } from '#formats/compression';
import { bufferToTiles, tilesToBuffer } from '#formats/art';
import { buffersToColors, colorsToBuffers } from '#formats/palette';
import { environment } from '#store/environment';
import { workspace } from '#store/workspace';
import ErrorMsg from './error';
import SaveLoad from './save-load';
import { promises } from 'fs';
const fs = promises;


import { mappingFormats, dplcFormats } from '#formats/definitions';
import { bufferToMappings, mappingsToBuffer } from '#formats/mapping';
import { asmToBin, stuffToAsm } from '#formats/asm';
import { toJS } from 'mobx';
import { readFileSync } from 'fs';
import { inspect } from 'util';

const compressionList = Object.keys(compressionFormats);

export const FileObject = observer(({ obj }) => {

    scripts.length; // react to script updates

    const { isAbsolute } = obj; // set in store/workspace

    const script = obj.format && runScript(obj.format);
    const safeScript = script && !script.error;

    function ioWrap(filePath, setError, e, cb) {
        setError();
        if (safeScript && filePath) {
            const done = SaveLoad.indicator(e);
            requestAnimationFrame(async () => {
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
        // savePalettes({ target: loadRef.current.childNodes[3] });
    }

    const [artError, setArtError] = useState();

    function loadArt(e) {
        ioWrap(obj.art.path, setArtError, e, async path => {
            const buffer = (await fs.readFile(path)).slice(obj.art.offset || 0);
            const tiles = bufferToTiles(buffer, obj.art.compression);
            environment.tiles.replace(tiles);
        });
    }

    function saveArt(e) {
        ioWrap(obj.art.path, setArtError, e, async path => {
            const tiles = tilesToBuffer(environment.tiles, obj.art.compression);
            await fs.writeFile(path, tiles);
        });
    }

    const [mappingError, setMappingError] = useState();

    function loadMappings(e) {
        ioWrap(obj.mappings.path, setMappingError, e, async path => {
            const buffer = obj.mappingsASM
                ? parseASM(await fs.readFile(path, 'utf8'))
                : await fs.readFile(path);

            const mappings = script.readMappings(buffer);
            if (mappings.error) throw mappings.error;
            environment.mappings.replace(mappings.sprites);
        });
    }

    function saveMappings(e) {
        ioWrap(obj.mappings.path, setMappingError, e, async path => {
            const mappings = script.writeMappings(environment.mappings);
            if (mappings.error) throw mappings.error;
            if (!obj.mappingsASM) {
                await fs.writeFile(path, writeBIN(mappings));
            }
        });
    }

    const [dplcError, setDPLCError] = useState();

    function loadDPLCs(e) {
        ioWrap(obj.dplcs.path, setDPLCError, e, async path => {
            const buffer = obj.dplcsASM
                ? parseASM(await fs.readFile(path, 'utf8'))
                : await fs.readFile(path);

            const dplcs = script.readDPLCs(buffer);
            if (dplcs.error) throw dplcs.error;
            environment.dplcs.replace(dplcs.sprites);
        });
    }

    function saveDPLCs(e) {
        ioWrap(obj.dplcs.path, setMappingError, e, async path => {
            const dplcs = script.writeDPLCs(environment.dplcs);
            if (dplcs.error) throw dplcs.error;
            if (!obj.dplcsASM) {
                await fs.writeFile(path, writeBIN(dplcs));
            }
        });
    }

    const [paletteError, setPaletteError] = useState();

    function loadPalettes(e) {
        ioWrap(true, setPaletteError, e, async ()  => {
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
                buffersToColors([{
                    buffer: await fs.readFile(path),
                    length,
                }]).forEach(line => {
                    if (cursor < 4) {
                        environment.palettes[cursor] = line;
                        cursor++;
                    }
                });
            }
        });
    }


    const plant = readFileSync('/home/cake/dev/flex2_test/res/map_plant_s1.asm', 'utf8');
    const sonicBIN = readFileSync('/home/cake/dev/flex2_test/res/Sonic2.bin');
    // const sonicDPLC = readFileSync('/home/cake/dev/flex2_test/res/SonicDPLC.asm', 'utf8');
    // const sonicASM = readFileSync('/home/cake/dev/flex2_test/res/Sonic.asm', 'utf8');
    // const sonicFlex = readFileSync('/home/cake/dev/flex2_test/res/SonicFlex.asm', 'utf8');
    // console.log([...sonicBIN].join`` === parseASM(sonicASM).join``)

    const mappings =
        script && !script.error && script.writeMappings(environment.mappings);


    return (
        <div>
            <div className="file-object">
                {safeScript && (
                    <div className="menu-item">
                        {/*
                        <pre> {inspect([...sonicComp], { depth: 9, maxArrayLength: Infinity })} </pre>
                        <pre> {inspect(mappings, { depth: 9 })} </pre>
                    <pre> {inspect(toJS(environment.dplcs), {depth: 9})} </pre>


                        <pre>
                        {plant.replace(/.+\s.+\s.+\s.+\s/,'')}
                        </pre>
                    */}

                        <div>
                        <pre>{writeASM(mappings)} </pre>
                        </div>

                    </div>
                )}
                <div className="menu-item">
                    <Item>Game Format</Item>
                    <Select options={scripts} store={obj} accessor="format" />
                </div>
                {script && <ErrorMsg error={script.error} />}
                <div className="menu-item">
                    <Item color="blue">Object</Item>
                    <div className="load-ref">
                        <div ref={loadRef}>
                            {Array.from({ length: 4 }, (_, i) => <span key={i} />)}
                        </div>
                        <SaveLoad
                            load={loadObject}
                            save={saveObject}
                        >
                        </SaveLoad>
                    </div>
                </div>
                <div className="menu-item">
                    <Item color="green">Art</Item>
                    <SaveLoad
                        load={loadArt}
                        save={saveArt}
                    />
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
                    <Input
                        store={obj.art}
                        accessor="offset"
                    />
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
                    <SaveLoad
                        load={loadMappings}
                        save={saveMappings}
                    />
                </div>
                <ErrorMsg error={mappingError} />
                <FileInput
                    label="Mappings"
                    store={obj.mappings}
                    accessor="path"
                    absolute={isAbsolute}
                />
                {obj.mappingsASM && (
                    <div className="menu-item">
                        <Item>ASM Label</Item>
                        <Input store={obj.mappings} accessor="label" />
                    </div>
                )}

                <div className="menu-item">
                    <Item>DPLCs Enabled</Item>
                    <Checkbox checked={obj.dplcs.enabled} onChange={() => {
                        obj.dplcs.enabled = !obj.dplcs.enabled;
                    }} />
                </div>
                {obj.dplcs.enabled && (<>
                    <div className="menu-item">
                        <Item color="red">DPLCs</Item>
                        <SaveLoad
                            load={loadDPLCs}
                            save={saveDPLCs}
                        />
                    </div>
                    <ErrorMsg error={dplcError} />
                    <FileInput
                        label="Mappings"
                        store={obj.dplcs}
                        accessor="path"
                        absolute={isAbsolute}
                    />
                    {obj.dplcsASM && (
                        <div className="menu-item">
                            <Item>ASM Label</Item>
                            <Input store={obj.dplcs} accessor="label" />
                        </div>
                    )}
                </>)}

                <div className="menu-item">
                    <Item color="magenta">Palettes</Item>
                    <SaveLoad
                        load={loadPalettes}
                    />
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
                                    options={['1', '2', '3', '4']}
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

                {obj.linesLeft > 0 && (
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
        </div>
    );
});
