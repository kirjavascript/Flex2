import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { environment } from '#store/environment';
import { Select, Slider } from '#ui';
import clamp from 'lodash/clamp';
import { Mapping } from './mapping';
import { Selection } from './selection';
import { mappingState } from './state';
import { Axes } from './axis';
import { DragSelect, attachDragSelectToNode } from './drag-select';

@observer
export class Mappings extends Component {

    onZoom = (e) => {
        const { scale } = mappingState;
        const { deltaY } = e.nativeEvent;
        mappingState.scale = clamp(scale + (deltaY > 0 ? -1 : 1), 1, 20);
        e.preventDefault();
    };

    /*
     * right + outside = drag
     * right + inside = toggle
     * left + inside = move
     */

    render() {

        const { buffer, index, mappings } = environment.currentSprite;
        const { scale, baseSize, x, y } = mappingState;

        return <div className="mappings">
            <div
                className="mappingContainer"
                onWheel={this.onZoom}
                ref={attachDragSelectToNode}
            >
                {mappings.reverse().map((mapping, mappingIndex) => {
                    return <div
                        key={mappingIndex}
                        style={{
                            zIndex: mappingIndex,
                            transform: `translate(${x}px,${y}px)`
                        }}
                    >
                        <Mapping
                            data={mapping}
                            tileBuffer={buffer}
                            scale={scale}
                        />
                    </div>;
                })}

                <svg width={baseSize} height={baseSize}>
                    <Axes/>
                    {false && <Selection
                        offset={6}
                        width={4}
                    />}

                    <Selection
                        color="magenta"
                        opacity={0.2}
                    />

                    <DragSelect/>
                </svg>
            </div>

            <Slider
                store={environment.config}
                accessor="currentSprite"
                min="0"
                max={environment.sprites.length-1}
            />

            import sprite over active frame
            current slide slider
            reset pan/zoom

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
