import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { environment } from '#store/environment';
import { Select } from '#ui';
import { magenta, blue } from '!!sass-variables-loader!#styles/variables.scss';

import { Mapping } from './mapping';

@observer
export class Mappings extends Component {

    render() {

        const { buffer, index, mappings } = environment.currentSprite;
        const scale = 4;

        return <div className="mappings">
            <div className="mappingContainer">
                {mappings.reverse().map((mapping, mappingIndex) => {
                    return <div
                        key={mappingIndex}
                        style={{zIndex: mappingIndex}}
                    >
                        <Mapping
                            data={mapping}
                            tileBuffer={buffer}
                            scale={scale}
                        />
                    </div>;
                })}

                <svg width={600} height={600}>
                    <defs>
                        <g id="inner-select">
                            {mappings.reverse().map(({left, top, width, height}, mappingIndex) => {
                                return (
                                    <rect
                                        key={mappingIndex}
                                        x={(left*scale) + 300}
                                        y={(top*scale) + 300}
                                        width={width*scale*8}
                                        height={height*scale*8}
                                        opacity={0.6}
                                    />
                                );
                            })}
                        </g>
                    </defs>
                    <mask id="inner-select-mask">
                        <rect x="0" y="0" width="100%" height="100%" fill="white"/>
                        <use xlinkHref="#inner-select" fill="black" />
                    </mask>
                    <g mask="url(#inner-select-mask)">
                        {mappings.reverse().map(({left, top, width, height}, mappingIndex) => {
                            const extraPixels = 5;
                            const baseWidth = width * scale * 8;
                            const baseHeight = height * scale * 8;
                            const x = (left * scale) + 300 - (extraPixels / 2);
                            const y = (top * scale) + 300 - (extraPixels / 2);

                            return (
                                <rect
                                    key={mappingIndex}
                                    x={x}
                                    y={y}
                                    width={baseWidth + extraPixels}
                                    height={baseHeight + extraPixels}
                                    fill={magenta}
                                />
                            );
                        })}
                    </g>
                </svg>
            </div>
            <pre>
                {JSON.stringify(mappings, null, 4)}
            </pre>

            zoom
            import sprite over active frame

            <Select
                label="Transparency"
                store={environment.config}
                accessor="transparency"
                options={[
                    {label: 'Enabled', value: true},
                    {label: 'Disabled', value: false},
                ]}
            />
        </div>;
    }

}
