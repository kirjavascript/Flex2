import React, { useEffect, useState, useRef } from 'react';
import { observer } from 'mobx-react';
import { Item, Input, File as FileInput, Select, Editor } from '#ui';
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
    // const path = workspacePath

    return (
        <div>
            Game Format <Select
                options={scripts}
                store={obj}
                accessor="format"
            />
            <Item color="yellow">Mappings</Item>
            <FileInput
                label="Mapping"
                store={obj.mappings}
                accessor="path"
                absolute
            />
        </div>
    );
});

// make fileinput allowed to edit text, add <Item> new
// create file -> choose directory -> focus on input
// file exists - select it anyway?

// checkbox

// load/save for everything - add in environment
// buttons for shit
// fix up project screen to always be open
// size / offset
