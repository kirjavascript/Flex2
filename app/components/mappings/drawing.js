// called from drag-move

import { LEFT, RIGHT } from './buttons';
import { select, event, mouse } from 'd3-selection';
import { mappingState } from './state';
import { environment } from '~/store/environment';
import { setDrawing } from '~/store/history';

let lastDrawX = null;
let lastDrawY = null;

export function drawStart(node) {
    setDrawing(true);
    lastDrawX = null;
    lastDrawY = null;
    draw(node);
}

export function drawEnd() {
    lastDrawX = null;
    lastDrawY = null;
    setDrawing(false);
}

function plotPixel(x, y, colorIndex, mappings, buffer) {
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
                buffer[bufferOffset][tileX + (tileY*8)] = colorIndex;
            }
        }
    });
}

export function draw(node) {
    const { sourceEvent: { buttons } } = event;
    const { scale, mode, drawIndexLeft, drawIndexRight } = mappingState;
    const { currentSprite: { mappings, buffer } } = environment;

    if (mode == 'drawing' && mappings.length && (buttons === LEFT || buttons === RIGHT)) {
        const [xPos, yPos] = mouse(node);

        const x = ((xPos - mappingState.x) / scale);
        const y = ((yPos - mappingState.y) / scale);
        const colorIndex = buttons === LEFT ? drawIndexLeft : drawIndexRight;

        if (lastDrawX !== null) {
            // Bresenham line from last point to current point
            let x0 = Math.floor(lastDrawX), y0 = Math.floor(lastDrawY);
            const x1 = Math.floor(x), y1 = Math.floor(y);
            const dx = Math.abs(x1 - x0);
            const dy = -Math.abs(y1 - y0);
            const sx = x0 < x1 ? 1 : -1;
            const sy = y0 < y1 ? 1 : -1;
            let err = dx + dy;

            for (;;) {
                plotPixel(x0, y0, colorIndex, mappings, buffer);
                if (x0 === x1 && y0 === y1) break;
                const e2 = 2 * err;
                if (e2 >= dy) { err += dy; x0 += sx; }
                if (e2 <= dx) { err += dx; y0 += sy; }
            }
        } else {
            plotPixel(Math.floor(x), Math.floor(y), colorIndex, mappings, buffer);
        }

        lastDrawX = x;
        lastDrawY = y;
    }
}
