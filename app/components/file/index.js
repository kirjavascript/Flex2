import React, { useEffect, useState, useRef } from 'react';
import { observer } from 'mobx-react';
import { Item, Input, File as FileInput, Select, Editor } from '#ui';
import { listing } from '#formats/scripts';

export const File = observer(() => {

    // useEffect(() => {


    // }, []);
    return <div>
        left align
        <FileInput />
        {JSON.stringify(listing)}
    </div>;
});
