import React from 'react';
import { observer } from 'mobx-react';
import { FileObject } from './file-object';
import { workspace } from '#store/workspace';

export const File = observer(() => {
    return (
        <FileObject obj={workspace.file} />
    );
});

// computed script for objectdef for format
//
// load/save for everything - add in environment
// buttons for shit
// fix up project screen to always be open
// size / offset
