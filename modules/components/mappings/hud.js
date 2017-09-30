import React, { Component } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { mappingState } from './state';

const numFmt = (num) => (
    `${num<0?'-':''}0x${(Math.abs(+num)).toString(16).toUpperCase()}`
);

@observer
export class HUD extends Component {

    render() {
        const { x, y, select: { active }, center, activeMappings, selectedIndicies } = mappingState;
        const { config: { currentSprite, dplcsEnabled }, mappings, tiles } = environment;

        return <div className="hud">
            sprite: <span className="blue">
                {numFmt(currentSprite)}/{numFmt(mappings.length)}
            </span>
            <br/>
            {center && (
                <div>
                    centre: <span className="blue">
                        x: {numFmt(center.x)} y: {numFmt(center.y)}
                    </span>
                </div>
            )}
            {!!activeMappings.length && (
                <div>
                    indicies: <span className="blue">
                        {JSON.stringify(selectedIndicies.filter((i) => {
                            return i < mappings[currentSprite].length;
                        }))}
                    </span>
                    <br/>
                    priority: <span className="blue">
                        {`[${
                            activeMappings.map((map) => map.priority ? '1' : '0')
                        }]`}
                    </span>
                    <br/>
                    palette line ?
                </div>
            )}
            DPLCs: <span className="blue">
                {dplcsEnabled ? '✔' : '✗'}
            </span>
            <br/>
        </div>;
    }

}
