import { environment } from '~/store/environment';
import range from 'lodash/range';
import { arrayIndexOf } from '~/util/array-index-of';

import { concatDPLCs } from './concat-dplcs';

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


    const newDPLCEntries = concatDPLCs(newDPLCs.map((d, i) => ({art: d, size: 1})));

    // restore metadata from original DPLCs by looking up the first tile in each new entry
    newDPLCEntries.forEach((entry) => {
        const originalIndex = tiles.indexOf(entry.art);
        if (originalIndex !== -1 && tileMetadata[originalIndex]) {
            entry.metadata = {...tileMetadata[originalIndex]};
        }
    });

    dplcs.replace(newDPLCEntries);
}
