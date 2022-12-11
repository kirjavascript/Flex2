import React, { Component } from 'react';
import { blue } from 'sass-variables';
import { observer } from 'mobx-react';
import { environment } from '#store/environment';
import { mappingState } from './state';
import { select, event, mouse } from 'd3-selection';
import { drag } from 'd3-drag';
import { LEFT, RIGHT } from './buttons';
import { runInAction } from 'mobx';

export function attachDragSelectToNode(node) {
    if (node) {
        select(node).call(
            drag()
                .filter(() => true)
                .on('start', () => {
                    const {
                        sourceEvent: { buttons },
                    } = event;
                    if (buttons & LEFT) {
                        const [x, y] = mouse(node);
                        mappingState.select.active = true;
                        mappingState.select.x0 = x;
                        mappingState.select.y0 = y;
                        mappingState.select.x1 = x;
                        mappingState.select.y1 = y;
                        setSelectedMappings(node);
                    }
                })
                .on('drag', () => {
                    const {
                        dx,
                        dy,
                        sourceEvent: { buttons },
                    } = event;
                    if (buttons & LEFT) {
                        const [x, y] = mouse(node);
                        mappingState.select.x1 = x;
                        mappingState.select.y1 = y;
                        setSelectedMappings(node);
                    } else if (buttons & RIGHT) {
                        // seem to get lag without using RAF
                        // cant profile it because the lag doesnt appear when profiling ?!
                        requestAnimationFrame(() => {
                            runInAction(() => {
                                mappingState.x += dx;
                                mappingState.y += dy;
                            });
                        });
                    }
                })
                .on('end', () => {
                    if (mappingState.select.active) {
                        setSelectedMappings(node);
                        mappingState.select.active = false;
                    }
                }),
        );
    }
}

function setSelectedMappings(node) {
    const { select: { active }, scale, x: offsetX, y: offsetY } = mappingState;
    if (active) {
        const { x, y, width, height } = mappingState.selectBBox;

        const indices = environment.currentSprite.mappings.reduce(
            (acc, mapping, index) => {
                const { top: my, left: mx, width: mw, height: mh } = mapping;

                if (
                    x - offsetX < mx * scale &&
                    x + width - offsetX > mx * scale + mw * scale * 8 &&
                    y - offsetY < my * scale &&
                    y + height - offsetY > my * scale + mh * scale * 8
                ) {
                    return [...acc, index];
                } else {
                    return acc;
                }
            },
            [],
        );

        mappingState.selectedIndices.replace(indices);
    }
}

export const DragSelect = observer(class DragSelect extends Component {
    render() {
        if (mappingState.select.active) {
            const { active, x, y, width, height } = mappingState.selectBBox;
            return (
                <g>
                    <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={blue}
                        opacity={0.2}
                    />
                    <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        stroke={blue}
                        strokeWidth={3}
                        fill="none"
                    />
                </g>
            );
        } else return false;
    }
});
