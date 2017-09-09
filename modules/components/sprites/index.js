import React, { Component } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { Sprite } from './sprite';

@observer
export class Sprites extends Component {

    render() {
        const { mappings } = environment;

        return <div>
            <div>(import sheet here)</div>

            <div className="sprites">
                {mappings.map((mappingList, spriteIndex) => (
                    <Sprite
                        key={spriteIndex}
                        spriteIndex={spriteIndex}
                        mappingList={mappingList}
                    />
                ))};
            </div>

        </div>;
    }

}
