import React, { useState, useRef } from 'react';
import { observer } from 'mobx-react';
import { Item, Input, File as FileInput, Select, Checkbox, Button } from '~/ui';
import { scripts, runScript } from '~/formats/scripts';
import { compressionFormats } from '~/formats/compression';
import ErrorMsg from './error';
import SaveLoad from './save-load';
import { createObjectIO } from './object-io';
import { extname, basename } from 'path';

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

    const loadRef = useRef();

    const [artError, setArtError] = useState();
    // one extra art source open at a time, the rest stay as summary rows
    const [openArt, setOpenArt] = useState(-1);
    const [mappingError, setMappingError] = useState();
    const [paletteError, setPaletteError] = useState();

    const objectIO = createObjectIO(obj, {
        script,
        setArtError,
        setMappingError,
        setPaletteError,
        targets: () => Array.from(loadRef.current.childNodes),
    });

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
                    <SaveLoad load={objectIO.loadObject} save={objectIO.saveObject}></SaveLoad>
                </div>
            </div>
            <div className="menu-item">
                <Item color="green">Art</Item>
                <SaveLoad load={objectIO.loadArt} save={objectIO.saveArt} />
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
                filtername="Art File"
                filterextensions={['bin', 'unc', 'kos', 'nem', 'eni', 'sor']}
            />

            {!!obj.art.path && <>
            <div className="menu-item">
                <Item color="green">Extra Art</Item>
                <Button
                    color="blue"
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
                                    : ` 0x${Number(source.address).toString(16)}`}
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
                                filtername="Art File"
                                filterextensions={['bin', 'unc', 'kos', 'nem', 'eni', 'sor']}
                            />
                        </div>
                    )}
                </div>
            ))}
            </>}

            <div className="menu-item">
                <Item color="yellow">Mappings</Item>
                <SaveLoad load={objectIO.loadMappingsAndDPLCs} save={objectIO.saveMappingsAndDPLCs} />
            </div>
            <ErrorMsg error={mappingError} />
            <FileInput
                label="Mappings"
                store={obj.mappings}
                accessor="path"
                absolute={isAbsolute}
                filtername="Mapping File"
                filterextensions={['asm', 's', 'bin']}
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
                                label="dplcs"
                                store={obj.dplcs}
                                accessor="path"
                                absolute={isAbsolute}
                                filtername="DPLC Mapping File"
                                filterextensions={['asm', 's', 'bin']}
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
                <SaveLoad load={objectIO.loadPalettes} save={objectIO.savePalettes} />
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
                            filtername="Palette File"
                            filterextensions={['pal', 'bin']}
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
                        filtername="Palette File"
                        filterextensions={['pal', 'bin']}
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
