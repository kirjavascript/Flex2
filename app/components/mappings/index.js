import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { environment } from '#store/environment';
import classNames from 'classnames';
import { mappingState } from './state';
import { Slider } from '#ui';
import { Mapping } from './mapping';
import { Selection } from './selection';
import { Axes } from './axis';
import { HUD } from './hud';
import { PaletteHUD } from './hud-palette';
import { Guidelines } from './guidelines';
import { NewMapping } from './new-mapping';
import { RawEditor } from './raw-editor';
import { Rotate } from './rotate';
import { DragSelect, attachDragSelectToNode } from './drag-select';
import { attachDragMoveToNode } from './drag-move';
import { Commands } from './commands';

export const Mappings = observer(class Mappings extends Component {
    mappingRef = (node) => {
        if (node) {
            this.mappingRefNode = node;
            attachDragMoveToNode(node);
            node.addEventListener('wheel', this.onZoom, { passive: false });
        } else {
            this.mappingRefNode.removeEventListener('wheel', this.onZoom);
        }
    };

    onZoom = (e) => {
        const { scale } = mappingState;
        mappingState.setZoom(scale + (e.deltaY > 0 ? -1 : 1));
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

    componentDidMount() {
        this.props.node.setEventListener('resize', (e) => {
            requestAnimationFrame(() => {
                const baseWidth = e.rect.width - 10;
                mappingState.setWidth(baseWidth);
            });
        });
    }

    render() {
        const { buffer, index, mappings } = environment.currentSprite;
        const { scale, x, y, baseWidth, mode, selectedIndices } = mappingState;

        return (
            <div className="mappings" ref={this.onRef}>
                <div
                    ref={this.mappingRef}
                    className="mappingContainer"
                    style={{
                        width: '100%',
                        height: 600,
                    }}
                >
                    {mappings.slice(0).reverse().map((mapping, mappingIndex) => {
                        const realIndex = mappings.length - 1 - mappingIndex;
                        return (
                            <div
                                key={mappingIndex}
                                style={{
                                    zIndex: mappingIndex,
                                    transform: `translate(${x}px,${y}px)`,
                                }}
                                className={classNames({
                                    'mapping-wrapper': mode == 'mapping',
                                    noselect: !selectedIndices.includes(
                                        realIndex,
                                    ),
                                })}
                                data-index={realIndex}
                                onDoubleClick={(e) => {
                                    mappingState.selectToggle(realIndex);
                                }}
                            >
                                <Mapping
                                    data={mapping}
                                    tileBuffer={buffer}
                                    scale={scale}
                                />
                            </div>
                        );
                    })}

                    {mode == 'mapping' && (
                        <div>
                            <HUD />
                            <Guidelines />
                            <NewMapping />
                        </div>
                    )}

                    <svg
                        width={baseWidth}
                        height={600}
                        ref={attachDragSelectToNode}
                    >
                        <Axes />
                        {mode == 'drawing' ? (
                            <g>
                                <Selection color="blue" opacity={0} all />
                            </g>
                        ) : (
                            <g>
                                <Selection color="magenta" opacity={0.2} />
                                <DragSelect />
                            </g>
                        )}
                    </svg>
                </div>

                {mode == 'drawing' && <PaletteHUD />}

                <Slider
                    store={environment.config}
                    accessor="currentSprite"
                    min="0"
                    max={environment.sprites.length - 1}
                    style={{ width: baseWidth }}
                />

                <RawEditor />
                <Rotate />

                <Commands />
            </div>
        );
    }
});
