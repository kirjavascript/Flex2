import React, { Component } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { Mapping } from '#components/mappings/mapping';
import { Item, Input } from '#ui';
import SVARS from '!!sass-variables-loader!#styles/variables.scss';

@observer
export class Sprite extends Component {

    render() {
        const { config } = environment;
        const { currentSprite } = config;
        let mappings, buffer, pos, frames, parent;

        try{
            mappings = this.props.data.mappings;
            buffer = this.props.data.buffer;
        } catch (error) {
            mappings = undefined;
            buffer = undefined;
        }
        pos = this.props.pos;
        frames = this.props.frames;
        parent = this.props.parent;

        if(pos != Infinity){
            return <div
                className="sprite"
                style={{
                    border: `1px solid ${SVARS['blue']}`,
                }}
            >
                <div>
                    <div className="index">
                        <Input
                            store={frames}
                            accessor={pos}
                            min='0'
                            max={environment.mappings.length}
                            isNumber={true}
                            width='32px'
                            onChange={() => {parent.forceUpdate();}}
                        />
                    </div>
                    
                    <div className="pos">
                        {pos}
                    </div>
                    {(!mappings || !mappings.length) && (
                        <div className="blank">
                            [BLANK]
                        </div>
                    )}
                    {mappings &&
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
                    }
                    <div 
                        className="remove"
                        onClick={() => {
                            frames.splice(pos, 1);
                            parent.forceUpdate();
                        }}
                    >
                        remove
                    </div>
                </div>
            </div>;
        } else {
            return <div
                className="sprite"
                style={{border: `1px solid ${SVARS['blue']}`}}
            >
                <div 
                    className="addspr"
                    onClick={() => {
                        frames.push(0);
                        parent.forceUpdate();
                    }
                }>+</div>
            </div>;
        }
    }

}
