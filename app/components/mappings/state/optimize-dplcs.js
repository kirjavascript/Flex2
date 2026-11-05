import { environment } from '~/store/environment';
import range from 'lodash/range';
import { arrayIndexOf } from '~/util/array-index-of';

import { concatDPLCs } from './concat-dplcs';
import { dplcOptions } from './dplc-options';

export function optimizeCurrentDPLCs() {
    const { currentSprite: { mappings, dplcs }, config } = environment;

    if (config.dplcsEnabled && dplcs.length) {
        optimizeDPLCs(mappings, dplcs);
    }
}

export function optimizeDPLCs(mappings, dplcs) {

    let tiles = [];
    let tileMetadata = [];

    dplcs.forEach(({art, size, metadata}) => {
        for (let i = 0; i < size; i++) {
            tiles.push(art + i);
            tileMetadata.push(metadata);
        }
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


    // each tile keeps the metadata of the entry it came from
    const newDPLCEntries = concatDPLCs(newDPLCs.map((art) => ({
        art,
        size: 1,
        metadata: tileMetadata[tiles.indexOf(art)],
    })), dplcOptions());

    dplcs.replace(newDPLCEntries);
}
