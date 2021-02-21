import React from 'react';
import { observer } from 'mobx-react';
import { Item, Input, File as FileInput, Select, Checkbox, Button } from '#ui';
import { scripts, runScript } from '#formats/scripts';
import { compressionFormats } from '#formats/compression';
import { environment } from '#store/environment';

import { mappingFormats, dplcFormats } from '#formats/definitions';
import { bufferToMappings, mappingsToBuffer } from '#formats/mapping';
import { asmToBin, stuffToAsm } from '#formats/asm';
import { readFileSync } from 'fs';

const compressionList = Object.keys(compressionFormats);

export const FileObject = observer(({obj, isAbsolute}) => {
    // useEffect(() => {

    // }, []);
    const script = scripts.length && runScript(scripts[0].value);
    // script && console.log(script);

    const buffer = obj.mappings.path && readFileSync(obj.mappings.path);
    const mappings = script && !script.error && script.readMappings(environment, buffer);

    // console.log(mappings.sections?.flat(3));

    const { frames, headerWords } = mappingsToBuffer(environment.mappings, mappingFormats['Sonic 1']);
    const out = stuffToAsm(frames, 'LABEL', true);

    return (
        <div>
            <div className="file-object">
                {script.error}
                {mappings?.error?.message}
                {script && !script.error && (<div className="menu-item">
                    <pre style={{border: '1px solid black'}}>
                        {JSON.stringify(mappings, null, 4)}
                    </pre>
                    <div>
                        <pre> {headerWords.map(d => d.map(d => '$' + d).join``).join`,`} </pre>
                        <pre> {out} </pre>
                    </div>
                </div>)}
                <div className="menu-item">
                    <Item>Game Format</Item>
                    <Select options={scripts} store={obj} accessor="format" />
                </div>
                <div className="menu-item">
                    <Item color="blue">Object</Item>
                    <div className="saveload">
                        <Button color="green">load</Button>
                        <Button color="orange">save</Button>
                    </div>
                </div>
                <div className="menu-item">
                    <Item color="green">Art</Item>
                    <div className="saveload">
                        <Button color="green">load</Button>
                        <Button color="orange">save</Button>
                    </div>
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
                    <div className="saveload">
                        <Button color="green">load</Button>
                        <Button color="orange">save</Button>
                    </div>
                </div>
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
                    <Checkbox checked onChange={() => {}} />
                </div>

                <div className="menu-item">
                    <Item color="red">DPLCs</Item>
                    <div className="saveload">
                        <Button color="green">load</Button>
                        <Button color="orange">save</Button>
                    </div>
                </div>
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
                <div className="menu-item">
                    <Item color="magenta">Palettes</Item>
                    <div className="saveload">
                        <Button color="green">load</Button>
                        <Button color="orange">save</Button>
                    </div>
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
