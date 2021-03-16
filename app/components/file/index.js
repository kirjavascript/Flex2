import React from 'react';
import { observer } from 'mobx-react';
import { FileObject } from './file-object';
import { workspace } from '#store/workspace';
import { Button } from '#ui';
import { selectTab } from '#components/layout/model';

// set focused tab
// selt focused obejct
export const File = observer(() => {
    return (
        <>
            <FileObject obj={workspace.file} />
            {workspace.project && (
                <div className="project-copy">
                    <Button color="blue" large onClick={() => {selectTab('Project')}}>copy to project</Button>
                </div>
            )}
        </>
    );
});
