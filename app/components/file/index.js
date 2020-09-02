import React, { useEffect, useState, useRef } from 'react';
import { observer } from 'mobx-react';
import { Item, Input, File as FileInput, Select, Editor } from '#ui';
import { listing, load } from '#formats/scripts';

export const File = observer(() => {
    // useEffect(() => {

    // }, []);
    if (listing.length) {
        // console.log('script');
        // load(listing[0].value);
    }
    return (
        <div>
            left align
            <FileInput />
            {JSON.stringify(listing)}
        </div>
    );
});

// make fileinput allowed to edit text
