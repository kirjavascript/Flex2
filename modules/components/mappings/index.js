import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { environment } from '#store/environment';
import { Item, Select, Slider } from '#ui';
import clamp from 'lodash/clamp';
import { Mapping } from './mapping';
import { Selection } from './selection';
import { mappingState } from './state';
import { Axes } from './axis';
import { HUD } from './hud';
import { DragSelect, attachDragSelectToNode } from './drag-select';

@observer
export class Mappings extends Component {

    onZoom = (e) => {
        const { scale } = mappingState;
        const { deltaY } = e.nativeEvent;
        mappingState.scale = clamp(scale + (deltaY > 0 ? -1 : 1), 1, 20);
        e.preventDefault();
    };

    componentWillMount() {
        this.props.node.setEventListener('resize', (e) => {
            requestAnimationFrame(() => {
                const { width } = e.rect;
                const baseWidth = e.rect.width - 10;
                mappingState.baseWidth = baseWidth;
                mappingState.x = (baseWidth / 2)|0;
                mappingState.y = 300;
            });
        });
    }

    /*
     * left + outside = select
     * left + inside = drag
     * doubleclick = toggle ?
     */

    render() {

        const { buffer, index, mappings } = environment.currentSprite;
        const { scale, x, y, baseWidth } = mappingState;

        return <div className="mappings" ref={this.onRef}>
            <div
                className="mappingContainer"
                onWheel={this.onZoom}
                ref={attachDragSelectToNode}
                style={{
                    width: '100%',
                    height: 600,
                }}
            >
                {mappings.reverse().map((mapping, mappingIndex) => {
                    return <div
                        key={mappingIndex}
                        style={{
                            zIndex: mappingIndex,
                            transform: `translate(${x}px,${y}px)`,
                        }}
                    >
                        <Mapping
                            data={mapping}
                            tileBuffer={buffer}
                            scale={scale}
                        />
                    </div>;
                })}

                <HUD/>

                <svg width={baseWidth} height={600}>
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
                style={{width: baseWidth}}
            />

            <Item
                onClick={mappingState.resetPanAndZoom}
                color="orange"
                prefix="="
                inverted>
                Reset Pan/Zoom
            </Item>


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
