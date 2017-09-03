import React, { Component } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { Tile } from './tile';

@observer
export class Art extends Component {

    render() {
        return <div>
            {environment.tiles.map((tile, i) => {
                return (
                    <Tile
                        key={i}
                        data={tile}
                        palette={environment.palettes[0]}
                    />
                );
            })}
        </div>;
    }

}
