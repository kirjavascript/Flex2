import React, { Component } from 'react';
import { blue } from '!!sass-variables-loader!#styles/variables.scss';
import { observer } from 'mobx-react';
import { mappingState } from './state';
import { select, event, mouse } from 'd3-selection';
import { drag } from 'd3-drag';

export function attachDragSelectToNode(node) {
    if (node) {
        select(node)
            .call(
                drag()
                    .filter(() => true)
                    .on('start', () => {
                        const { dx, dy, sourceEvent: { button } } = event;
                        if (button == 2) {
                            const [x, y] = mouse(node);
                            mappingState.select.active = true;
                            mappingState.select.x0 = x;
                            mappingState.select.y0 = y;
                            mappingState.select.x1 = x;
                            mappingState.select.y1 = y;
                        }
                    })
                    .on('drag', () => {
                        const { dx, dy, sourceEvent: { button } } = event;
                        if (button == 2) {
                            const [x, y] = mouse(node);
                            mappingState.select.x1 = x;
                            mappingState.select.y1 = y;
                        }
                        else if (button == 1) {
                            mappingState.x += dx;
                            mappingState.y += dy;
                        }
                    })
                    .on('end', () => {
                        const { dx, dy, sourceEvent: { button } } = event;
                        if (button == 2) {
                            mappingState.select.active = false;
                        }
                    })
            );
    }
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
