import React, { Component } from 'react';
import { blue } from '!!sass-variables-loader!#styles/variables.scss';
import { observer } from 'mobx-react';
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
                        else if (button == MIDDLE) {
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
    const {x, y, width, height} = mappingState.selectBBox;
    const indicies = Array.from(node.querySelectorAll('.mapping'))
        .reverse()
        .reduce((a, mapping, i) => {
            const bbox = mapping.getBoundingClientRect();
            return do {
                if (
                    x + 300 < bbox.left &&
                    x + width + 300 > bbox.left + bbox.width &&
                    y < bbox.top &&
                    y + height > bbox.top + bbox.height
                ) (
                    [... a, i]
                );
                else (
                    a
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
