import { environment } from '#store/environment';
import range from 'lodash/range';

import { concatDPLCs } from './concat-dplcs';

export function deleteUnusedDPLCs() {
    const { currentSprite: { mappings, dplcs }, config } = environment;

    if (config.dplcsEnabled && dplcs.length) {

        let tiles = [];

        dplcs.forEach(({art, size}) => {
            tiles.push(...range(art, art+size));
        });


        // get mappings used by tiles
        const mappingTiles = mappings.map(({width, height, art}) => (
            Array.from({length: width * height}, (_, i) => tiles[art+i])
                .filter((tile) => typeof tile !== 'undefined')
        ));

        let newDPLCs = [];

        mappings.forEach((mapping, i) => {
            // search for existing (dupes)
            const existingIndicies = mappingTiles[i].map((d) => newDPLCs.indexOf(d));
            if (
                existingIndicies.length && // check all tiles are defined
                !existingIndicies.some((d) => d == -1) && // tiles exist in new list
                    existingIndicies
                        .every((d, i) => (
                            i === existingIndicies.length - 1 ||
                            d < existingIndicies[i + 1]
                        )) // and are all sequential
                ) {
                mapping.art = existingIndicies[0];
            }
            else if (mapping.art < tiles.length) { // check start of dplcs falls before tile cutoff
                mapping.art = newDPLCs.length;
                newDPLCs.push(...mappingTiles[i]);
            }
        });


        dplcs.replace(concatDPLCs(newDPLCs.map((d) => ({art: d, size: 1}))));
    }
}
