import React, { useState } from 'react';
import { observer } from 'mobx-react';
import { Item, Input, File as FileInput, Select, Checkbox, Button } from '#ui';
import { scripts, runScript, parseASM } from '#formats/scripts';
import { compressionFormats } from '#formats/compression';
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

    const { isAbsolute } = obj; // set in store/workspace

    const script = obj.format && runScript(obj.format);
    const safeScript = script && !script.error;

    const [mappingError, setMappingError] = useState();

    function loadMappings(e) {
        setMappingError();
        if (safeScript && obj.mappings.path) {
            const done = SaveLoad.indicator(e);
            requestAnimationFrame(async () => {
                const path = isAbsolute
                    ? obj.mappings.path
                    : workspace.absolutePath(obj.art.path);

                try {
                    const buffer = obj.mappingsASM
                        ? parseASM(await fs.readFile(path, 'utf8'))
                        : await fs.readFile(path)

                    const mappings = script.readMappings(buffer)
                    if (mappings.error) throw mappings.error;
                    environment.mappings.replace(mappings.sprites);
                } catch (e) {
                    setMappingError(e);
                } finally {
                    done();
                }
            });
        }
    }

    // script && console.log(script);

    // const buffer = obj.mappings.path && readFileSync(obj.mappings.path, 'utf8');
    const buffer =
        obj.mappings.path &&
        readFileSync('/home/cake/dev/flex2_test/res/map_plant_s1.bin');
    const asm =
        obj.mappings.path &&
        readFileSync('/home/cake/dev/flex2_test/res/map_plant_s1.asm', 'utf8');
    // console.log(buffer.length, parseASM(asm).length)
    // const t = parseASM(asm).filter((d, i) => buffer[i] !==  d)
    // console.log(t);
    //
    const sonicBIN = readFileSync('/home/cake/dev/flex2_test/res/Sonic.bin');
    const sonicComp = readFileSync('/home/cake/dev/flex2_test/res/SonicComp.bin');
    const sonicASM = readFileSync('/home/cake/dev/flex2_test/res/Sonic.asm', 'utf8');
    // console.log([...sonicBIN].join`` === parseASM(sonicASM).join``)

    const mappings =
        script && !script.error && script.readMappings(sonicBIN);

    // environment.mappings.replace(mappings.sprites && mappings.sprites)

    // const { frames, headerWords } = mappingsToBuffer(environment.mappings, mappingFormats['Sonic 1']);
    // const out = stuffToAsm(frames, 'LABEL', true);

    return (
        <div>
            <div className="file-object">
                {safeScript && (
                    <div className="menu-item">
                        {/*
                    <pre style={{border: '1px solid black'}}>
                        {JSON.stringify(mappings, null, 4)}
                    </pre>
                        <pre> {headerWords.map(d => d.map(d => '$' + d).join``).join`,`} </pre>
                    <pre> {JSON.stringify(environment.mappings, null, 4)} </pre>
                        <pre> {inspect(parseASM(out).join`,` === [...buffer].join`,`, {depth: 9})} </pre>
                    <pre> {inspect(parseASM(out), {depth: 9})} </pre>


                    <pre> {inspect(mappings, {depth: 9})} </pre>
                    <div>
                        <pre>
                        </pre>

                        <pre>
                    </pre>
                    // <pre> {inspect(require('mobx').toJS(environment.mappings), {depth: 9})} </pre>

                        <pre> {inspect(mappings, { depth: 9 })} </pre>
                        <pre> {inspect(parseASM(sonicASM), { depth: 9 })} </pre>
                    </div>

                        <pre> {inspect([...sonicComp], { depth: 9 })} </pre>

                        <pre> {inspect(parseASM(asm), { depth: 9 })} </pre>
                        <pre> {inspect([...sonicBIN], { depth: 9 })} </pre>
                        <pre> {inspect(parseASM(sonicASM), { depth: 9 })} </pre>
                    */}

                        <pre> {inspect(mappings, { depth: 9 })} </pre>
                        <pre> {inspect(toJS(environment.mappings), { depth: 9 })} </pre>
                    </div>
                )}
                <div className="menu-item">
                    <Item>Game Format</Item>
                    <Select options={scripts} store={obj} accessor="format" />
                </div>
                {script && <ErrorMsg error={script.error} />}
                <div className="menu-item">
                    <Item color="blue">Object</Item>
                    <SaveLoad
                    />
                </div>
                <div className="menu-item">
                    <Item color="green">Art</Item>
                    <SaveLoad
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
                <FileInput label="Art" store={obj.art} accessor="path" />

                <div className="menu-item">
                    <Item color="yellow">Mappings</Item>
                    <SaveLoad
                        load={loadMappings}
                    />
                </div>
                <ErrorMsg error={mappingError} />
                <FileInput
                    label="Mappings"
                    store={obj.mappings}
                    accessor="path"
                    absolute={obj.isAbsolute}
                />
                {obj.mappingsASM && (
                    <div className="menu-item">
                        <Item>ASM Label</Item>
                        <Input store={obj.mappings} accessor="label" />
                    </div>
                )}

                <div className="menu-item">
                    <Item>DPLCs Enabled</Item>
                    <Checkbox checked={obj.dplcs.enabled} onChange={() => {}} />
                </div>

                <div className="menu-item">
                    <Item color="red">DPLCs</Item>
                    <SaveLoad
                    />
                </div>
                <FileInput
                    label="Mappings"
                    store={obj.dplcs}
                    accessor="path"
                    absolute={obj.isAbsolute}
                />
                {obj.dplcsASM && (
                    <div className="menu-item">
                        <Item>ASM Label</Item>
                        <Input store={obj.dplcs} accessor="label" />
                    </div>
                )}
                <div className="menu-item">
                    <Item color="magenta">Palettes</Item>
                    <SaveLoad
                    />
                </div>
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
                                absolute={obj.isAbsolute}
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

// computed script for objectdef for format
//
// load/save for everything - add in environment
// buttons for shit
// fix up project screen to always be open
// size / offset
