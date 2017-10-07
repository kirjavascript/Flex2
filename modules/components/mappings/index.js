import React, { Component } from 'react';
import Masonry from 'react-masonry-component';
import { observer } from 'mobx-react';
import { environment } from '#store/environment';
import { commands } from '#controls/commands';
import { mappingState } from './state';
import { Item, Slider } from '#ui';
import { Mapping } from './mapping';
import { Selection } from './selection';
import { Axes } from './axis';
import { HUD } from './hud';
import { Guidelines } from './guidelines';
import { NewMapping } from './new-mapping';
import { RawEditor } from './raw-editor';
import { DragSelect, attachDragSelectToNode } from './drag-select';
import { attachDragMoveToNode } from './drag-move';

@observer
export class Mappings extends Component {

    onZoom = (e) => {
        const { scale } = mappingState;
        const { deltaY } = e.nativeEvent;
        mappingState.setZoom(scale + (deltaY > 0 ? -1 : 1));
        e.preventDefault();
    };

    onRef = (node) => {
        if (node) {
            requestAnimationFrame(() => {
                const { width } = node.getBoundingClientRect();
                mappingState.setWidth(width);
            });
        }
    };

    componentWillMount() {
        this.props.node.setEventListener('resize', (e) => {
            requestAnimationFrame(() => {
                const baseWidth = e.rect.width - 10;
                mappingState.setWidth(baseWidth);
            });
        });
    }

    render() {

        const { buffer, index, mappings } = environment.currentSprite;
        const { scale, x, y, baseWidth } = mappingState;

        return <div className="mappings" ref={this.onRef}>


            <div
                onWheel={this.onZoom}
                ref={attachDragMoveToNode}
                className="mappingContainer"
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
                <NewMapping/>

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

            <RawEditor/>

            <Masonry
                className="commands"
                style={{
                    width: Math.max((0|(baseWidth / 220)) * 220, 220),
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
                                inverted
                            >
                                {map}
                            </Item>
                        ))}
                    </div>
                ))}
            </Masonry>
        </div>;
    }

}
