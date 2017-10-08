import React from 'react';
import { render } from 'react-dom';
import { observer } from 'mobx-react';
import { importState } from './state';
import { Item, Select } from '#ui';

@observer
class Importer extends React.Component {

    render() {
        const { config: { active } } = importState;

        return active && <div className="importer">
            <Item
                color="red"
                inverted
                onClick={importState.cancel}
            >
                Cancel Import
            </Item>
            importer

            <canvas
                ref={importState.canvasRef}
            />
        </div>;
    }
}

render(
    <Importer/>,
    document.body.appendChild(document.createElement('div')),
);
