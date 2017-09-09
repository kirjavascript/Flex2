import React, { Component } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { Tile } from './tile';
import { Item, Input, File, Select, Editor } from '#ui';

@observer
export class Art extends Component {

    render() {
        return <div className="art">
            <Select
                label="Transparency"
                store={environment.config}
                accessor="transparency"
                options={[
                    {label: 'Enabled', value: true},
                    {label: 'Disabled', value: false},
                ]}
            />
            <div className="tile-list">
                {environment.tiles.map((tile, i) => {
                    return (
                        <Tile
                            key={i}
                            data={tile}
                            palette={environment.palettes[0]}
                        />
                    );
                })}
            </div>
        </div>;
    }

}
