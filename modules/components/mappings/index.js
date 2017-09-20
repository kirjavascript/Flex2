import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { environment } from '#store/environment';
import { Select, Slider } from '#ui';

import { Mapping } from './mapping';
import { Selection } from './selection';
import { mappingState } from './state';

@observer
export class Mappings extends Component {

    render() {

        const { buffer, index, mappings } = environment.currentSprite;
        const { scale, baseSize } = mappingState;

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

                <svg width={baseSize} height={baseSize}>
                    {false && <Selection
                        offset={6}
                        width={4}
                    />}

                    <Selection
                        color="magenta"
                        opacity={0.2}
                    />
                </svg>
            </div>
            <Slider
                store={mappingState}
                accessor="scale"
            />

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

            <pre>
                {JSON.stringify(mappings, null, 4)}
            </pre>
        </div>;
    }

}
