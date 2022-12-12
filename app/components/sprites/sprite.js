import React, { Component } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { Mapping } from '#components/mappings/mapping';
import { getBounds } from '#components/mappings/state/bounds';
import SVARS from 'sass-variables';
import { spriteState } from './state';

const { max, min, abs, floor } = Math;

export const Sprite = observer(class Sprite extends Component {

    render() {
        const { config } = environment;
        const { currentSprite } = config;

        const { index, mappings, buffer } = this.props.data;

        // const scale = min(5, max(floor(100 / spriteState.zoom), 1));
        const scale = spriteState.zoom;
        return <div
            className="sprite"
            style={{
                border: `1px solid ${SVARS[currentSprite == index ? 'magenta' : 'blue']}`,
            }}
        >
            <div className="index">
                0x{index.toString(16).toUpperCase()}
            </div>

            {!mappings.length && (
                <div className="blank">
                    [BLANK]
                </div>
            )}
            {mappings.slice(0).reverse().map((mapping, mappingIndex) => {
                return <div
                    key={mappingIndex}
                    style={{zIndex: mappingIndex}}
                >
                    <Mapping
                        scale={spriteState.zoom}
                        data={mapping}
                        tileBuffer={buffer}
                    />
                </div>;
            })}
        </div>;
    }

});
