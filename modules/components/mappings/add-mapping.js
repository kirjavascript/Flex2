import React, { Component } from 'react';
import { mappingState } from './state';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { Mapping } from './mapping';
import chunk from 'lodash/chunk';

const baseConfig = {
    hflip: false,
    vflip: false,
    palette: 0,
    top: 0,
    left: 0,
};

// zoom on drag

@observer
export class AddMapping extends Component {

    render() {
        // const { guidelinesAbs: { x, y }, guidelines: { enabled } } = mappingState;
        const enabled = false;
        const { tiles, config: { currentTile } } = environment;
        const { scale } = mappingState;

        const mapDefz = chunk(Array.from({length: 0x10}, (_, i) => ({
            art: currentTile,
            width: (i%4)+1,
            height: 0|(i/4)+1,
            ...baseConfig,
        })), 4);

        return enabled && <div className="add-mapping">
            {mapDefz.map((group, i) => (
                <div key={i} className="group">
                    {group.map((def, i) => (
                        <Mapping
                            key={i}
                            data={def}
                            scale={4}
                            tileBuffer={tiles}
                        />
                    ))}
                </div>
            ))}
        </div>;
    }

}
