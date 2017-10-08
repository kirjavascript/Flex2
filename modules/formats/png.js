import { environment } from '#store/environment';
const { dialog } = require('electron').remote;
import { writeFile } from 'fs';
import { errorMsg } from '#util/dialog';

export function exportPNG() {
    const { currentSprite: { buffer, mappings }, palettes } = environment;

    if (!mappings.length) return;

    const canvas = document.createElement('canvas');
    // canvas.className = 'canvas-debug';
    // canvas.style.width = '200px';
    // document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let tileBuffer = ctx.getImageData(0, 0, 8, 8);

    const [xPoints, yPoints] = [[], []];
    mappings.forEach(({top, left, width, height}) => {
        xPoints.push(left, left + (width*8));
        yPoints.push(top, top + (height*8));
    });

    const minX = xPoints.reduce((a, c) => Math.min(a, c));
    const maxX = xPoints.reduce((a, c) => Math.max(a, c));
    const width = maxX - minX;
    const minY = yPoints.reduce((a, c) => Math.min(a, c));
    const maxY = yPoints.reduce((a, c) => Math.max(a, c));
    const height = maxY - minY;

    canvas.width = width;
    canvas.height = height;

    const mappingCanvas = document.createElement('canvas');
    const mappingCtx = mappingCanvas.getContext('2d');

    mappings.reverse().forEach((mapping) => {
        // convert palette from web to rgb
        const palette = palettes[mapping.palette]
            .map((color) => (
                color.slice(1).split``.map((d) => parseInt(`${d}${d}`, 16))
            ));

        mappingCanvas.width = mapping.width * 8;
        mappingCanvas.height = mapping.height * 8;

        // draw tiles to mapping canvas
        Array.from({length: mapping.width * mapping.height})
            .forEach((_, index) => {
                const tile = buffer[mapping.art + index] || Array.from({length: 0x40}).fill(0);

                for (let i = 0, j = 0; i < 64; i++, j+=4) {
                    tileBuffer.data[j] = palette[tile[i] || 0][0];
                    tileBuffer.data[j+1] = palette[tile[i] || 0][1];
                    tileBuffer.data[j+2] = palette[tile[i] || 0][2];
                    tileBuffer.data[j+3] = tile[i] == 0 ? 0 : 255;
                }

                const left = (((index / mapping.height)|0) * 8);
                const top = ((index % mapping.height) * 8);

                mappingCtx.putImageData(tileBuffer, left, top);

            });

        // crazy awkward flipping
        if (mapping.hflip || mapping.vflip) {
            ctx.scale(
                mapping.hflip ? -1 : 1,
                mapping.vflip ? -1 : 1,
            );
            ctx.drawImage(
                mappingCanvas,
                mapping.hflip ? -1 * ((mapping.width * 8) - (-mapping.left) - minX) : mapping.left - minX,
                mapping.vflip ? -1 * ((mapping.height * 8) - (-mapping.top) - minY) : mapping.top - minY,
            );
            // reset scale
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
        else {
            ctx.drawImage(mappingCanvas, mapping.left - minX, mapping.top - minY);
        }

    });

    dialog.showSaveDialog({
        title: 'Export Sprite',
        defaultPath: `0x${environment.config.currentSprite.toString(16)}.png`,
        filters: [{name: 'PNG Image File', extensions: ['png']}],
    }, (filename) => {
        if (filename) {
            const base64Data = canvas.toDataURL().replace(/data(.*?),/, '');
            writeFile(filename, new Buffer(base64Data, 'base64'), (err, success) => {
                err && errorMsg('Error exporting sprite', String(err));
            });
        }
    });

}
