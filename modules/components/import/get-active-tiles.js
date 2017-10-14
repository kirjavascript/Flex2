import min from 'lodash/min';

export function getActiveTiles(buffer, width, height, startX = 0, startY = 0) {

    let activeTiles = [];
    // do this 7*7 times to get the offset

    for (let x = startX; x < width-8; x+=8) {
        for (let y = startY; y < height-8; y+=8) {
            // tile
            for (let i = 0; i < 64; i++) {
                const pX = (i % 8) + x;
                const pY = ((i / 8)|0) + y;
                const pos = ((pY * width) + pX) * 4;

                if (buffer.data[pos+3] !== 0) {
                    activeTiles.push({ x, y });
                    break;
                }
            }
        }
    }

    return activeTiles;
}

export function getBestOffsets(canvas, ctx) {
    const { width, height } = canvas;
    const buffer = ctx.getImageData(0, 0, width, height);

    let activeTiles = [];

    for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
            activeTiles.push(getActiveTiles(buffer, width, height, x, y));
        }
    }

    return min(activeTiles);
}
