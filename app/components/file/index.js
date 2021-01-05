import React, { useEffect, useState, useRef } from 'react';
import { observer } from 'mobx-react';
import { Item, Input, File as FileInput, Select, Editor } from '#ui';
import { scripts, runScript } from '#formats/scripts';
import { environment } from '#store/environment';

export const File = observer(() => {
    // useEffect(() => {

    // }, []);
    const script = scripts.length && runScript(scripts[0].value);
    script && console.log(script);
    script && !script.error && console.log(script.dumpMappings(env));

    return (
        <div>
            left align
            <FileInput />
        </div>
    );
});

// make fileinput allowed to edit text
