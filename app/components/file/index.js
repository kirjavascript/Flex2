import React, { useEffect, useState, useRef } from 'react';
import { observer } from 'mobx-react';
import { Item, Input, File as FileInput, Select, Editor } from '#ui';
import { scriptListing } from '#formats/scripts';
// console.log(require('electron').remote.app.getAppPath())
// const chokidar = require('chokidar');

// chokidar.watch('./scripts').on('all', console.log)

// just load scripts from dropdown

export const File = observer(() => {

    useEffect(() => {


    }, []);
    return <div>
        left align
        <FileInput />
        {JSON.stringify(scriptListing())}
    </div>;
});
