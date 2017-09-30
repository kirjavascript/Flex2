import React, { Component } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { mappingState } from './state';

const numFmt = (num) => `0x${(+num).toString(16).toUpperCase()}`;

@observer
export class HUD extends Component {

    render() {
        const { x, y, select: { active }, selectedIndicies } = mappingState;
        const { config: { currentSprite, dplcsEnabled }, mappings, tiles } = environment;

        return <div className="hud">
            sprite: <span className="blue">
                {numFmt(currentSprite)}/{numFmt(mappings.length)}
            </span>
            <br/>
            mappings:
            <br/>
            DPLCs: <span className="blue">
                {dplcsEnabled ? '✔' : '✗'}
            </span>
            <br/>
        </div>;
    }

}
