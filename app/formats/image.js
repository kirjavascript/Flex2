import { environment } from '#store/environment';
const { dialog } = require('@electron/remote');
import { writeFile } from 'fs';
import { errorMsg } from '#util/dialog';
import { colorMatch } from '#components/import/color-match';

function exportSprite({ buffer, mappings }) {

    const { palettesRGB } = environment;

    const canvas = document.createElement('canvas');
    if (!mappings.length) {
        canvas.width = 32;
        canvas.height = 32;
        return canvas;
    }
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

    mappings.slice(0).reverse().forEach((mapping) => {
        const palette = palettesRGB[mapping.palette];

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

    return canvas;
}


export function exportSpritesheet() {
    const { sprites } = environment;
    if (!sprites.length) return;

    dialog.showSaveDialog({
        title: 'Export Spritesheet',
        defaultPath: `spritesheet.png`,
        filters: [{name: 'PNG Image', extensions: ['png']}],
    })
        .then(({ filePath }) => {
            if (filePath) {

                const canvases = sprites.map(({ buffer, mappings }) => exportSprite({ buffer, mappings }));

                const canvas = document.createElement('canvas');
                canvas.width = 8;
                canvas.height = 8;
                const ctx = canvas.getContext('2d');
                // canvas.className = 'canvas-debug';
                // document.body.appendChild(canvas);

                let cursor = 8;

                canvases.forEach(current => {
                    const last = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const { width, height } = current;
                    const diff = width + 8;
                    canvas.width += diff
                    canvas.height = Math.max(canvas.height, height + 8);
                    ctx.putImageData(last, 0, 0);
                    ctx.drawImage(current, cursor, 8);
                    cursor += diff;
                    canvas.remove();
                });

                const base64Data = canvas.toDataURL().replace(/data(.*?),/, '');
                canvas.remove();
                writeFile(filePath, Buffer.from(base64Data, 'base64'), (err) => {
                    err && errorMsg('Error exporting spritesheet', String(err));
                });
            }
        })
        .catch(console.error);

}

export function exportPNG() {
    const { currentSprite: { buffer, mappings }, sprites } = environment;

    if (!mappings.length || !sprites.length) return;

    const canvas = exportSprite({ buffer, mappings });

    dialog.showSaveDialog({
        title: 'Export Sprite',
        defaultPath: `0x${environment.config.currentSprite.toString(16).toUpperCase()}.png`,
        filters: [{name: 'PNG Image', extensions: ['png']}],
    })
        .then(({ filePath }) => {
            if (filePath) {
                const base64Data = canvas.toDataURL().replace(/data(.*?),/, '');
                canvas.remove();
                writeFile(filePath, Buffer.from(base64Data, 'base64'), (err, success) => {
                    err && errorMsg('Error exporting sprite', String(err));
                });
            }
        })
        .catch(console.error);
}

export async function importImg() {

    // get path

    const path = await dialog.showOpenDialog({
            title: 'Import Sprite',
            properties: ['openFile'],
            filters: [{name: 'Image File', extensions: ['bmp', 'jpg', 'jpeg', 'png', 'gif']}],
        })
            .then(({ filePaths: [path] }) => path)
            .catch(console.error);

    if (!path) return;

    // load image

    const img = await (new Promise((resolve) => {
        const img = new Image();
        img.onload = () => { resolve(img); };
        img.onerror = (e) => { resolve(null); };
        img.src = path;
    }));

    if (!img) return errorMsg('Import Error', `Error loading ${path}`);

    // get smallest X/Y

    const { currentSprite: { buffer, mappings }, palettesRGB, sprites } = environment;

    const minX = mappings.reduce((a, c) => c.left < a ? c.left : a, Infinity);
    const minY = mappings.reduce((a, c) => c.top < a ? c.top : a, Infinity);

    if (!mappings.length || !sprites.length) return;

    // render image

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // convert to tiles

    mappings.forEach(async ({ top, left, palette, vflip, hflip, width, height, art }) => {
        const x = left - minX;
        const y = top - minY;
        const paletteLine = palettesRGB[palette];

        // handle flipping
        const flipCtx = await flipBuffer(
            ctx.getImageData(x, y, width * 8, height * 8),
            hflip,
            vflip,
        );

        for (let i = 0; i < (width * height); i++) {
            const offX = (0|(i / height)) * 8;
            const offY = (i % height) * 8;

            const tileBuffer = colorMatch(flipCtx.getImageData(offX, offY, 8, 8), palette);

            const bufferOffset = art + i;
            if (bufferOffset < buffer.length) {
                buffer[bufferOffset].replace(getPixels(tileBuffer, paletteLine));
            }
        }

    });

    canvas.remove();
}

function flipBuffer(buffer, hflip, vflip) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    return new Promise((resolve) => {
        canvas.width = buffer.width;
        canvas.height = buffer.height;
        ctx.putImageData(buffer, 0, 0);

        if (!hflip && !vflip) {
            resolve(ctx);
        }
        else {
            const img = new Image();

            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.scale(
                    hflip ? -1 : 1,
                    vflip ? -1 : 1,
                );
                ctx.drawImage(img, hflip ? - (canvas.width): 0, vflip ? - (canvas.height): 0);
                resolve(ctx);
            };
            img.onerror = () => {
                // throw new Error('Mapping fragment error');
            };
            img.src = canvas.toDataURL();
        }

    });
}

function getPixels(tileBuffer, paletteLine) {
    let pixels = [];
    for (let j = 0; j < tileBuffer.data.length; j+=4) {
        if (tileBuffer.data[j+3] == 0) {
            pixels.push(0);
        }
        else {
            for (let p = 1; p < paletteLine.length; p++) {
                let [R, G, B] = paletteLine[p];
                if (
                    R == tileBuffer.data[j] &&
                    G == tileBuffer.data[j+1] &&
                    B == tileBuffer.data[j+2]
                ) {
                    pixels.push(p);
                    break;
                }
            }
        }
    }
    return pixels;
}
