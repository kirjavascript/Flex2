import React from 'react';
import { render } from 'react-dom';
import { observer } from 'mobx-react';
import { importState } from './state';
import { DetectSprites } from './ui-detect';
import { ImportSprites } from './ui-import';

@observer
class Importer extends React.Component {

    render() {
        const { config: { active }, sprites } = importState;

        if (active && !!sprites.length) {
            return <ImportSprites/>;
        } else if (active) {
            return <DetectSprites/>;
        } else {
            return false;
        }
    }
}

render(
    <Importer/>,
    document.body.appendChild(document.createElement('div')),
);
