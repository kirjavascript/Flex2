import { mappingState } from './state';
import { select, event, mouse } from 'd3-selection';
import { drag } from 'd3-drag';
import { LEFT, RIGHT, MIDDLE } from './buttons';
import { draw } from './drawing';

export function attachDragMoveToNode(node) {
    if (node) {
        select(node)
            .call(
                drag()
                    .filter(() => true)
                    .on('start', () => {
                        const { dx, dy, sourceEvent: { buttons, target } } = event;
                        const { move, activeMappings, selectedIndices } = mappingState;

                        const mappingNode = target.closest('.mapping-wrapper');
                        const sourceIndex = mappingNode ? +mappingNode.getAttribute('data-index') : -1;
                        const sourceIsActive = ~selectedIndices.indexOf(sourceIndex);

                        if (buttons == LEFT && sourceIsActive) {
                            move.init.replace([]);

                            activeMappings.forEach(({left, top}) => {
                                move.init.push({left, top});
                            });

                            move.x = 0;
                            move.y = 0;
                            move.active = true;
                        }

                        draw(node);
                    })
                    .on('drag', () => {
                        const { dx, dy, sourceEvent: { buttons, target } } = event;
                        const { move } = mappingState;

                        if (buttons == LEFT && move.active) {
                            move.x += dx;
                            move.y += dy;
                            const xOffset = 0|(move.x/mappingState.scale);
                            const yOffset = 0|(move.y/mappingState.scale);
                            mappingState.mutateActive((mapping, index) => {
                                const { top, left } = move.init[index];
                                mapping.top = top + yOffset;
                                mapping.left = left + xOffset;
                            });
                        }

                        draw(node);
                    })
                    .on('end', () => {
                        const { dx, dy, sourceEvent: { buttons, target } } = event;

                        if (buttons == LEFT && mappingState.move.active) {
                            mappingState.move.active = false;
                        }
                    })
            );
    }
}
