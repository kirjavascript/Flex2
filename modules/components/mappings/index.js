import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { environment } from '#store/environment';
import { Item, Slider } from '#ui';
import clamp from 'lodash/clamp';
import { Mapping } from './mapping';
import { Selection } from './selection';
import { mappingState } from './state';
import { Axes } from './axis';
import { HUD } from './hud';
import { DragSelect, attachDragSelectToNode } from './drag-select';
import { attachDragMoveToNode } from './drag-move';
import { commands } from '#controls/commands';
import { Guidelines } from './guidelines';
let Masonry = require('react-masonry-component');

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

    render() {

        const { buffer, index, mappings } = environment.currentSprite;
        const { scale, x, y, baseWidth } = mappingState;

        return <div className="mappings" ref={this.onRef}>
            <div
                className="mappingContainer"
                onWheel={this.onZoom}
                style={{
                    width: '100%',
                    height: 600,
                }}
                ref={attachDragMoveToNode}
            >
                {mappings.reverse().map((mapping, mappingIndex) => {
                    return <div
                        key={mappingIndex}
                        style={{
                            zIndex: mappingIndex,
                            transform: `translate(${x}px,${y}px)`,
                        }}
                        className="mapping-wrapper"
                        data-index={mappings.length - 1 - mappingIndex}
                        onDoubleClick={(e) => {
                            const realIndex = mappings.length - 1 - mappingIndex;
                            mappingState.selectToggle(realIndex);
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
                <Guidelines/>

                <svg
                    width={baseWidth}
                    height={600}
                    ref={attachDragSelectToNode}
                >
                    <Axes/>

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

            <Masonry
                className="commands"
                style={{
                    width: (0|(baseWidth / 220)) * 220,
                }}
            >
                {commands.map((group, i) => (
                    <div key={i} className="group">
                        {group.map(({name, map, func, color}) => (
                            <Item
                                onClick={func}
                                key={name}
                                color={color || 'blue'}
                                prefix={name}
                                inverted>
                                {map}
                            </Item>
                        ))}
                    </div>
                ))}
            </Masonry>

            <pre>
                {JSON.stringify(mappings, null, 4)}
            </pre>
        </div>;
    }

}
