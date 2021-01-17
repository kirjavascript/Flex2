import React, { useEffect, useState, useRef } from 'react';
import { observer } from 'mobx-react';
import { Item, Input, File as FileInput, Select, Editor } from '#ui';
import { scripts, runScript } from '#formats/scripts';
import { environment } from '#store/environment';
import { workspace } from '#store/workspace';

const { file } = workspace;

export const File = observer(() => {
    // useEffect(() => {

    // }, []);
    const script = scripts.length && runScript(scripts[0].value);
    // console.log(scripts);
    // script && console.log(script);
    // script && !script.error && console.log(script.dumpMappings(environment));

    return (
        <div>
            Game Format <Select
                options={scripts}
                store={file}
                accessor="format"
                value={file.format}
            />
            <FileInput store={file.mappings} accessor="path" />
        </div>
    );
});
// have value for select as

// make fileinput allowed to edit text, add <Item> new
// storage for file screen
// buttons for shit
// fix up project screen to always be open
