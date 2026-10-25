import { environment } from '~/store/environment';
import { getCenter } from '../mappings/state/bounds';
import { concatDPLCs } from '../mappings/state/concat-dplcs';
import { prepareMetadataFill } from '../mappings/state/fill-metadata';
import { dplcOptions } from '../mappings/state/dplc-options';

function readTile(ctx, x, y, palette) {
    const tile = ctx.getImageData(x, y, 8, 8);

    let pixels = [];
    for (let j = 0; j < tile.data.length; j+=4) {
        if (tile.data[j+3] <= 0x80) {
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
    return pixels;
}

export function importSprite(ctx, newMappings, paletteLine) {
    const {
        palettesRGB,
        mappings,
        dplcs,
        spriteMetadata,
        config: { currentSprite, dplcsEnabled },
    } = environment;
    const fillMetadata = prepareMetadataFill();

    const bankLine = environment.currentBank?.paletteLine || 0;
    const shiftedLine = (paletteLine + bankLine + environment.config.artPaletteLine) % 4;
    const palette = palettesRGB[shiftedLine];

    let newMappingsList = [];
    let newDPLCsList = [];
    let lastDPLCIndex = 0;

    newMappings.forEach(({x, y, width, height}) => {
        // tiles go into the bank being worked on, so the index they land at is
        // that bank's, not the length of the flattened view over every bank
        const startTile = environment.nextTile;
        const newTiles = [];
        for (let h = 0; h < width; h++) {
            for (let v = 0; v < height; v++) {
                const xPos = x + (h*8);
                const yPos = y + (v*8);
                newTiles.push(readTile(ctx, xPos, yPos, palette));
            }
        }
        environment.appendTiles(newTiles);

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
        dplcs.push(concatDPLCs(newDPLCsList, dplcOptions()));
    }
    const center = getCenter(newMappingsList);
    mappings.push(newMappingsList.map((mapping) => {
        mapping.left -= center.x;
        mapping.top -= center.y;
        return mapping;
    }));
    // without a real entry the sprite gets a throwaway {} and edits are lost
    while (spriteMetadata.length < mappings.length) {
        spriteMetadata.push({});
    }
    fillMetadata(mappings.length - 1);
    environment.config.currentSprite = mappings.length -1;

}
