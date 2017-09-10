import React, { Component } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { Mapping } from '../mappings/mapping';
import SVARS from 'sass-variables-loader!#styles/variables.scss';

@observer
export class Sprite extends Component {

    render() {
        const { mappings, tileBuffers, palettes, config } = environment;
        const { currentSprite } = config;

        const { spriteIndex, mappingList } = this.props;

            // onClick={() => {config.currentSprite = spriteIndex;}}
        return <div
            className="sprite"
            style={{
                border: `1px solid ${SVARS[currentSprite == spriteIndex ? 'magenta' : 'blue']}`,
            }}
        >
            <div className="index">
                0x{spriteIndex.toString(16).toUpperCase()}
            </div>
            {!mappingList.length && (
                <div className="blank">
                    [BLANK]
                </div>
            )}
            <div>
                {mappingList.reverse().map((mapping, mappingIndex) => {
                    return <Mapping
                        key={mappingIndex}
                        data={mapping}
                        tileBuffer={tileBuffers[spriteIndex]}
                    />;
                })}
            </div>
        </div>;
    }

}
