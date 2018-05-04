import React, { Component } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { Mapping } from '#components/mappings/mapping';
import SVARS from '!!sass-variables-loader!#styles/variables.scss';

@observer
export class Sprite extends Component {

    render() {
        const { config } = environment;
        const { currentSprite } = config;
        let index, mappings, buffer, pos;

        try{
            index = this.props.data.index;
            mappings = this.props.data.mappings;
            buffer = this.props.data.buffer;
            pos = this.props.pos;
        } catch (error) {
            index = -1;
            mappings = undefined;
            buffer = undefined;
            pos = 'undefined';
        }

        if(mappings){
            return <div
                className="sprite"
                style={{
                    border: `1px solid ${SVARS['blue']}`,
                }}
            >
                <div>
                    <div className="index">
                        0x{index.toString(16).toUpperCase()}
                    </div>
                    <div className="pos">
                        {pos}
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
                    <div className="remove">
                        remove
                    </div>
                </div>
            </div>;
        } else {
            return <div
                className="sprite"
                style={{border: `1px solid ${SVARS['blue']}`}}
            >
                <div className="addspr">+</div>
            </div>;
        }
    }

}
