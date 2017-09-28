import React, { Component } from 'react';
import { blue } from '!!sass-variables-loader!#styles/variables.scss';
import { observer } from 'mobx-react';
import { environment } from '#store/environment';
import { mappingState } from './state';
import { select, event, mouse } from 'd3-selection';
import { drag } from 'd3-drag';

const LEFT = 0;
const MIDDLE = 1;
const RIGHT = 2;

export function attachDragSelectToNode(node) {
    if (node) {
        select(node)
            .call(
                drag()
                    .filter(() => true)
                    .on('start', () => {
                        const { dx, dy, sourceEvent: { button } } = event;
                        if (button == LEFT) {
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
                        const { dx, dy, sourceEvent: { button } } = event;
                        if (button == LEFT) {
                            const [x, y] = mouse(node);
                            mappingState.select.x1 = x;
                            mappingState.select.y1 = y;
                            setSelectedMappings(node);
                        }
                        else if (button == RIGHT) {
                            mappingState.x += dx;
                            mappingState.y += dy;
                        }
                    })
                    .on('end', () => {
                        const { dx, dy, sourceEvent: { button } } = event;
                        if (button == LEFT) {
                            setSelectedMappings(node);
                            mappingState.select.active = false;
                        }
                    })
            );
    }
}

function setSelectedMappings(node) {
    const { scale, x: offsetX, y: offsetY } = mappingState;
    const { x, y, width, height } = mappingState.selectBBox;

    const indicies = environment.currentSprite.mappings.reduce((acc, mapping, index) => {
        const { top: my, left: mx, width: mw, height: mh } = mapping;

        return do {
            if (
                x - offsetX < (mx * scale) &&
                x + width - offsetX > (mx * scale) + (mw * scale * 8) &&
                y - offsetY < (my * scale) &&
                y + height - offsetY > (my * scale) + (mh * scale * 8)
            ) (
                [...acc, index]
            );
            else (
                acc
            );
        };
    }, []);

    mappingState.selectedIndicies.replace(indicies);
}

@observer
export class DragSelect extends Component {

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
        }
        else return false;
    }

}
