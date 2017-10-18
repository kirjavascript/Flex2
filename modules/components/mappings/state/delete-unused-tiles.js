import { environment } from '#store/environment';
import { mappingState } from './index';
import range from 'lodash/range';

export function deleteUnusedTiles() {
    const { sprites, config: { dplcsEnabled }, tiles } = environment;

    let usedIndicies = [];

    sprites.forEach(({mappings, dplcs}) => {
        if (dplcsEnabled) {
            dplcs.forEach(({art, size}) => {
                usedIndicies.push(...range(art, art + size));
            });
        }
        else {
            mappings.forEach(({art, width, height}) => {
                usedIndicies.push(...range(art, art + (width * height)));
            });
        }
    });

    const unusedIndicies = Array.from({length: tiles.length}, (_, i) => i)
        .filter((index) => !usedIndicies.includes(index));

    // save initial art positions to compare against
    sprites.forEach(({mappings, dplcs}) => {
        (dplcsEnabled ? dplcs : mappings)
            .forEach((obj) => {
                obj.initialArt = obj.art;
            });
    });

    unusedIndicies.forEach((index) => {
        // mark as unused
        tiles[index].unused = true;

        // shift art positions
        sprites.forEach(({dplcs, mappings}) => {
            (dplcsEnabled ? dplcs : mappings)
                .forEach((obj) => {
                    if (obj.initialArt > index) {
                        obj.art -= 1;
                    }
                });
        });
    });

    // apply new tiles
    tiles.replace(tiles.filter((d) => !d.unused));

    // cleanup
    sprites.forEach(({dplcs, mappings}) => {
        (dplcsEnabled ? dplcs : mappings)
            .forEach((obj) => {
                delete obj.initialArt;
            });
    });
}
