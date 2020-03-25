import React from 'react';
import { render } from 'react-dom';
import { observer } from 'mobx-react';
import { importState } from './state';
import { Item, Select, Input } from '#ui';
import { fuzzyAssert, zoomAssert } from '#util/assertions';
import { DetectSprites } from './ui-detect';
import { ImportSprites } from './ui-import';

@observer
class Importer extends React.Component {

    render() {
        const { config: { active }, sprites } = importState;

        return do {
            if (active && !!sprites.length) {
                <ImportSprites/>;
            }
            else if (active) {
                <DetectSprites/>;
            }
            else {
                false;
            }
        };
    }
}

render(
    <Importer/>,
    document.body.appendChild(document.createElement('div')),
);
