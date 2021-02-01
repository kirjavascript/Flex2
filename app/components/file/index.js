import React, { useEffect, useState, useRef } from 'react';
import { observer } from 'mobx-react';
import { Item, Input, File as FileInput, Select, Checkbox } from '#ui';
import { scripts, runScript } from '#formats/scripts';
import { environment } from '#store/environment';
import { workspace } from '#store/workspace';
import { toJS } from 'mobx';

export const File = observer(() => {
    // useEffect(() => {

    // }, []);
    const script = scripts.length && runScript(scripts[0].value);
    // script && console.log(script);
    // script && !script.error && console.log(script.dumpMappings(environment));

    const obj = workspace.file;
    const isAbsolute = true;
    // const path = workspacePath

    return (
        <div>
            <div>
                Game Format <Select
                    options={scripts}
                    store={obj}
                    accessor="format"
                />
                loca/save

                <Item color="yellow">Mappings</Item>
                Load / Save
                <FileInput
                    label="Mappings"
                    store={obj.mappings}
                    accessor="path"
                    absolute={isAbsolute}
                />

                <div style={{padding:5}}>
                    <Checkbox checked onChange={() => {}}/>
                </div>
                <Item color="red">DPLCs</Item>
                <button color="red">
                    hello
                </button>
                Load / Save
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
