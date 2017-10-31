import { environment } from '#store/environment';
import range from 'lodash/range';
import { arrayIndexOf } from '#util/array-index-of';

import { concatDPLCs } from './concat-dplcs';

export function optimizeCurrentDPLCs() {
    const { currentSprite: { mappings, dplcs }, config } = environment;

    if (config.dplcsEnabled && dplcs.length) {
        optimizeDPLCs(mappings, dplcs);
    }
}

export function optimizeDPLCs(mappings, dplcs) {

    const { config } = environment;

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
        const existingTilesIndex = arrayIndexOf(mappingTiles[i], newDPLCs);

        if (existingTilesIndex != -1) {
            mapping.art = existingTilesIndex;
        }
        else if (mapping.art < tiles.length) { // check start of dplcs falls before tile cutoff
            mapping.art = newDPLCs.length;
            newDPLCs.push(...mappingTiles[i]);
        }
    });


    dplcs.replace(concatDPLCs(newDPLCs.map((d) => ({art: d, size: 1}))));
}
