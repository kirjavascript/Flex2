import React, { Component } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { mappingState } from './state';

const numFmt = (num) => `${0>num?'-':''}0x${(Math.abs(+num)).toString(16).toUpperCase()}`;

export const HUD = observer(class HUD extends Component {

    render() {
        const { x, y, select: { active }, center, activeMappings, selectedIndices, newMapping } = mappingState;
        const { config: { currentSprite, dplcsEnabled, currentTile }, mappings, tiles } = environment;

        return <div className="hud">
            sprite: <span className="blue">
                {numFmt(currentSprite)}/{numFmt(mappings.length)}
            </span>
            <br/>
            {newMapping.active && (
                <div>
                    tile: <span className="blue">
                        {numFmt(currentTile)}/{numFmt(tiles.length)}
                    </span>
                </div>
            )}
            {center && (
                <div>
                    centre: <span className="blue">
                        x: {numFmt(center.x)} y: {numFmt(center.y)}
                    </span>
                </div>
            )}
            {!!activeMappings.length && (
                <div>
                    indices: <span className="blue">
                        {JSON.stringify(selectedIndices.filter((i) => {
                            return i < mappings[currentSprite].length;
                        }))}
                    </span>
                    <br/>
                    priority: <span className="blue">
                        {`[${
                            activeMappings.map((map) => map.priority ? '1' : '0')
                        }]`}
                    </span>
                </div>
            )}
            DPLCs: <span className="blue">
                {dplcsEnabled ? '✔' : '✗'}
            </span>
            <br/>
        </div>;
    }

});
