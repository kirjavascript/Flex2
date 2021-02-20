import React, { useEffect, useState, useRef } from 'react';
import { observer } from 'mobx-react';
import { Item, Input, File as FileInput, Select, Checkbox, Button } from '#ui';
import { scripts, runScript } from '#formats/scripts';
import { environment } from '#store/environment';
// import { compressionFormats } from '#formats/compression';
import { workspace } from '#store/workspace';
import { toJS, observable } from 'mobx';

// const compressionList = observable(Object.keys(compressionFormats));

export const File = observer(() => {
    // useEffect(() => {

    // }, []);
    const script = scripts.length && runScript(scripts[0].value);
    // script && console.log(script);
    // script && !script.error && console.log(script.dumpMappings(environment));

    const obj = workspace.file;
    const isAbsolute = true;
    // const path = workspacePath
    // use dplcs enabled

    return (
        <div>
            <div className="file-object">
                <div className="menu-item">
                    <Item>Game Format</Item>
                    <Select
                        options={scripts}
                        store={obj}
                        accessor="format"
                    />
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
                <File
                    store={obj.art}
                    accessor="path"
                />

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

                <div className="menu-item">
                    <Item>DPLCs Enabled</Item>
                    <Checkbox checked onChange={() => {}}/>
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
