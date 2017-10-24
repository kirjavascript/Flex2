// called from drag-move

import { LEFT, RIGHT, MIDDLE } from './buttons';
import { select, event, mouse } from 'd3-selection';
import { mappingState } from './state';
import { environment } from '#store/environment';

export function draw(node) {
    const { sourceEvent: { button } } = event;
    const { scale, mode, drawIndexLeft, drawIndexRight } = mappingState;
    const { currentSprite: { mappings, buffer } } = environment;

    if (mode == 'drawing' && mappings.length) {
        const [xPos, yPos] = mouse(node);

        const x = ((xPos - mappingState.x) / scale);
        const y = ((yPos - mappingState.y) / scale);

        mappings.forEach(({top, left, width, height, art, vflip, hflip}) => {
            if (
                x >= left &&
                x < left + (width*8) &&
                y >= top &&
                y < top + (height*8)
            ) {
                const realAbsX = 0|(x - left);
                const realAbsY = 0|(y - top);
                const absX = hflip ? (width * 8) - realAbsX - 1 : realAbsX;
                const absY = vflip ? (height * 8) - realAbsY - 1 : realAbsY;
                const tileX = absX % 8;
                const tileY = absY % 8;
                const mapX = 0|(absX / 8);
                const mapY = 0|(absY / 8);

                const tileOffset = (mapX * height) + mapY;
                const bufferOffset = art + tileOffset;

                if (bufferOffset < buffer.length) {
                    buffer[bufferOffset][tileX + (tileY*8)] = do {
                        if (button == LEFT) {
                            drawIndexLeft;
                        }
                        else if (button == RIGHT) {
                            drawIndexRight;
                        }
                    };
                }
            }


        });

    }

}
