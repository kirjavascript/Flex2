import { environment } from '~/store/environment';
import { mappingState } from './index';
import range from 'lodash/range';

export function deleteUnusedTiles() {
    const { sprites, config: { dplcsEnabled }, currentBank } = environment;

    if (!currentBank) return;

    // only the bank being worked on loses tiles: every other bank keeps its
    // address, so indices outside this bank must not move
    const base = currentBank.address;
    const end = base + currentBank.tiles.length;

    let usedIndices = [];

    sprites.forEach(({mappings, dplcs}) => {
        if (dplcsEnabled) {
            dplcs.forEach(({art, size}) => {
                usedIndices.push(...range(art, art + size));
            });
        }
        else {
            mappings.forEach(({art, width, height}) => {
                usedIndices.push(...range(art, art + (width * height)));
            });
        }
    });

    const unusedIndices = range(base, end)
        .filter((index) => !usedIndices.includes(index));

    if (!unusedIndices.length) return;

    sprites.forEach(({dplcs, mappings}) => {
        (dplcsEnabled ? dplcs : mappings)
            .forEach((obj) => {
                if (obj.art < base || obj.art >= end) return;
                obj.art -= unusedIndices.filter((index) => index < obj.art).length;
            });
    });

    environment.replaceTiles(
        currentBank.tiles.filter((tile, i) => !unusedIndices.includes(base + i)),
    );
}
