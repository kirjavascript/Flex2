import React, { Component } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { Mapping } from '../mappings/mapping';
import SVARS from '!!sass-variables-loader!#styles/variables.scss';

@observer
export class Sprite extends Component {

    render() {
        const { config } = environment;
        const { currentSprite } = config;

        const { index, mappings, buffer } = this.props.data;

        return <div
            className="sprite"
            style={{
                border: `1px solid ${SVARS[currentSprite == index ? 'magenta' : 'blue']}`,
            }}
        >
            <div>
                <div className="index">
                    0x{index.toString(16).toUpperCase()}
                </div>
                {!mappings.length && (
                    <div className="blank">
                        [BLANK]
                    </div>
                )}
                <div>
                    {mappings.reverse().map((mapping, mappingIndex) => {
                        return <div
                            key={mappingIndex}
                            style={{zIndex: mappingIndex}}
                        >
                            <Mapping
                                data={mapping}
                                tileBuffer={buffer}
                            />
                        </div>;
                    })}
                </div>
            </div>
        </div>;
    }

}
