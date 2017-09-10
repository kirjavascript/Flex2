import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { environment } from '#store/environment';
import { Sprite } from '../sprites/sprite';

@observer
export class DPLCs extends Component {

    render() {
        const { mappings, currentSprite } = environment;

        return <pre>
            <Sprite data={currentSprite}/>

            <div>(maybe move into mappings)</div>
            {JSON.stringify(environment.dplcs, null, 4)}
        </pre>;
    }

}
