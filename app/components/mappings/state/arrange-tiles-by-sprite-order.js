import { environment } from '~/store/environment';
import range from 'lodash/range';
import { arrayIndexOf } from '~/util/array-index-of';

export function arrangeTilesBySpriteOrder() {

    let newTiles = [];
    let newTilesIndices = [];

    const { mappings, dplcs, config: { dplcsEnabled }, currentBank } = environment;

    if (!currentBank) return;

    // only the bank being worked on is rearranged, at its own address: objects
    // reading from another bank are left where they point
    const base = currentBank.address;
    const end = base + currentBank.tiles.length;

    (dplcsEnabled ? dplcs : mappings).forEach((objList) => {

        objList.forEach((obj) => {
            const length = obj.size || obj.width * obj.height;
            const { art } = obj;

            if (art < base || art + length > end) return;

            const objTileIndices = range(art, art +length);
            const indicesTileIndex = arrayIndexOf(objTileIndices, newTilesIndices);

            if (indicesTileIndex != -1) {
                obj.art = base + indicesTileIndex;
            }
            else {
                obj.art = base + newTiles.length;
                newTiles.push(...currentBank.tiles.slice(art - base, art - base + length));
                newTilesIndices.push(...objTileIndices);
            }

        });

    });

    environment.replaceTiles(newTiles);

}
