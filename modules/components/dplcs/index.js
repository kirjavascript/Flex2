import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { environment } from '#store/environment';
import { Sprite } from '../sprites/sprite';
import { Tile } from '../art/tile';

@observer
export class DPLCs extends Component {

    render() {
        const { mappings, currentSprite, config } = environment;

        return do {
            if (config.dplcsEnabled) {
                <pre>
                    {JSON.stringify(environment.dplcs[config.currentSprite], null, 4)}
                    <Sprite data={currentSprite}/>
                    {currentSprite.buffer.map((tile, i) => (
                        <Tile data={tile} key={i} />
                    ))}
                </pre>;
            }
            else {
                <div>(convert to dplcs)</div>;
            }
        };
    }

}
