import { environment } from '#store/environment';
import { mappingState } from './index';
import range from 'lodash/range';
import flatten from 'lodash/flatten';

// this file could use some work

function getDPLCTiles() {
    return environment.currentSprite.dplcs.reduce((a, c) => {
        a.tiles.push(range(a.lastIndex, a.lastIndex + c.size));
        a.lastIndex += c.size;
        return a;
    }, {lastIndex: 0, tiles: []}).tiles;
}

function getMappingTiles() {
    const mappingTiles = [];
    environment.currentSprite.mappings.forEach(({art, width, height}) => {
        const qty = width * height;
        mappingTiles.push(range(art, art + qty));
    });
    return mappingTiles;
}

function deleteDPLCs (dplcStatus, dplcTiles) {
    const { currentSprite: { mappings, dplcs }, config } = environment;

    const artDiffs = mappings.map((d) => 0);

    dplcs.forEach((dplc, i) => {

        // if the dplc isn't used...
        if (dplcStatus[i]) {
            dplc.unused = true;
            const dplcStartIndex = dplcTiles[i][0];

            mappings.forEach((mapping, i) => {
                // if art index comes after the dplc index we have to shift it by the size of the dplc
                if (mapping.art > dplcStartIndex) {
                    // don't mutate to ensure calculations are correct
                    artDiffs[i] -= dplc.size;
                }
            });
        }

    });

    // apply diffs to mapping art indices
    artDiffs.forEach((diff, i) => {
        mappings[i].art += diff;
    });

    // finally, remove dplcs flagged as unused
    dplcs.replace(dplcs.filter((d) => !d.unused));
}

export function deleteUnusedDPLCs() {
    const { currentSprite: { mappings, dplcs }, config } = environment;

    if (config.dplcsEnabled) {
        const dplcTiles = getDPLCTiles();
        const mappingTiles = getMappingTiles();

        // get list of tiles used by mappings
        const tiles = flatten(mappingTiles);

        // get which dplcs can be deleted
        const dplcStatus = dplcTiles.map((arr) => {
            return !arr.some((d) => tiles.includes(d));
        });

        deleteDPLCs(dplcStatus, dplcTiles);

    }
}

//import { concatDPLCs } from './concat-dplcs';

//export function deleteUnusedDPLCs() {
//    const { currentSprite: { mappings, dplcs }, config } = environment;

//    if (config.dplcsEnabled) {

//        let tiles = [];

//        dplcs.forEach(({art, size}) => {
//            tiles.push(...range(art, art+size));
//        });


//        // get mappings used by tiles
//        const mappingTiles = mappings.map(({width, height, art}) => (
//            Array.from({length: width * height}, (_, i) => tiles[art+i])
//        ));

//        let newDPLCs = [];

//        mappings.forEach((mapping, i) => {
//            // search for existing (dupes)
//            const existingIndicies = mappingTiles[i].map((d) => newDPLCs.indexOf(d));
//            if (
//                !existingIndicies.some((d) => d == -1) && // all tiles exist
//                    existingIndicies
//                        .every((d, i) => (
//                            i === existingIndicies.length - 1 ||
//                            d < existingIndicies[i + 1]
//                        )) // and are all sequential
//                ) {
//                mapping.art = existingIndicies[0];
//            }
//            else {
//                mapping.art = newDPLCs.length;
//                newDPLCs.push(...mappingTiles[i]);
//            }
//        });

//        dplcs.replace(concatDPLCs(newDPLCs.map((d) => ({art: d, size: 1}))));


//        // dont add dplcs for non existant
//        //if mappings hit > dplc.length, leave value alone
//    }
//}
