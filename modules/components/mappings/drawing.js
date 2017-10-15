// called from drag-move

import { LEFT, RIGHT, MIDDLE } from './buttons';
import { select, event, mouse } from 'd3-selection';
import { mappingState } from './state';
import { environment } from '#store/environment';

export function draw(node) {
    const { sourceEvent: { button } } = event;
    const { scale, mode, drawIndex } = mappingState;
    const { currentSprite: { mappings, buffer } } = environment;

    if (mode == 'drawing') {
        const [xPos, yPos] = mouse(node);

        const x = ((xPos - mappingState.x) / scale);
        const y = ((yPos - mappingState.y) / scale); // no fucking idea about this minus one

        mappings.forEach(({top, left, width, height, art}) => {
            if (
                x >= left &&
                x < left + (width*8) &&
                y >= top &&
                y < top + (height*8)
            ) {
                const absX = 0|(x - left);
                const absY = 0|(y - top);
                const tileX = absX % 8;
                const tileY = absY % 8;
                const mapX = 0|(absX / 8);
                const mapY = 0|(absY / 8);

                const tileOffset = (mapX * height) + mapY;

                buffer[art + tileOffset][tileX + (tileY*8)] = do {
                    if (button == LEFT) {
                        drawIndex;
                    }
                    else {
                        0;
                    }
                };
            }


        });

    }

}
