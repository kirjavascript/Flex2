import React from 'react';
import { observer } from 'mobx-react';
import { FileObject } from './file-object';
import { workspace } from '#store/workspace';

export const File = observer(() => {
    return (
        <FileObject obj={workspace.file} />
    );
});
