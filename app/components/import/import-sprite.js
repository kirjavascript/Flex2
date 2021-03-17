import { environment } from '#store/environment';
import { getCenter } from '../mappings/state/bounds';
import { concatDPLCs } from '../mappings/state/concat-dplcs';

function addTile(ctx, x, y, palette) {
    const { tiles } = environment;
    const tile = ctx.getImageData(x, y, 8, 8);

    let pixels = [];
    for (let j = 0; j < tile.data.length; j+=4) {
        if (tile.data[j+3] < 255) {
            pixels.push(0);
        } else {
            for (let p = 1; p < palette.length; p++) {
                let [R, G, B] = palette[p];
                if (
                    R == tile.data[j] &&
                    G == tile.data[j+1] &&
                    B == tile.data[j+2]
                ) {
                    pixels.push(p);
                    break;
                }
            }
        }
    }
    tiles.push(pixels);
}

export function importSprite(ctx, newMappings, paletteLine) {
    const {
        palettesRGB,
        tiles,
        mappings,
        dplcs,
        config: { currentSprite, dplcsEnabled },
    } = environment;

    const palette = palettesRGB[paletteLine];

    let newMappingsList = [];
    let newDPLCsList = [];
    let lastDPLCIndex = 0;

    newMappings.forEach(({x, y, width, height}) => {
        const startTile = tiles.length;
        for (let h = 0; h < width; h++) {
            for (let v = 0; v < height; v++) {
                const xPos = x + (h*8);
                const yPos = y + (v*8);
                addTile(ctx, xPos, yPos, palette);
            }
        }

        newMappingsList.push({
            art: dplcsEnabled ? lastDPLCIndex : startTile,
            priority: false,
            left: x,
            top: y,
            width,
            height,
            vflip: false,
            hflip: false,
            palette: paletteLine,
        });


        if (dplcsEnabled) {
            const dplcSize = width * height;
            newDPLCsList.push({
                art: startTile,
                size: dplcSize,
            });
            lastDPLCIndex += dplcSize;
        }

    });

    if (dplcsEnabled) {
        dplcs.push(concatDPLCs(newDPLCsList));
    }
    const center = getCenter(newMappingsList);
    mappings.push(newMappingsList.map((mapping) => {
        mapping.left -= center.x;
        mapping.top -= center.y;
        return mapping;
    }));
    environment.config.currentSprite = mappings.length -1;

}
