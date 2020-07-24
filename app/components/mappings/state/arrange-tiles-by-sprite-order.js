import { environment } from '#store/environment';
import range from 'lodash/range';
import { arrayIndexOf } from '#util/array-index-of';

export function arrangeTilesBySpriteOrder() {

    let newTiles = [];
    let newTilesIndices = [];

    const { tiles, mappings, dplcs, config: { dplcsEnabled } } = environment;

    (dplcsEnabled ? dplcs : mappings).forEach((objList, index) => {

        objList.forEach((obj) => {
            const length = obj.size || obj.width * obj.height;
            const { art } = obj;

            const objTileIndices = range(art, art +length);
            const indicesTileIndex = arrayIndexOf(objTileIndices, newTilesIndices);

            if (indicesTileIndex != -1) {
                obj.art = indicesTileIndex;
            }
            else {
                obj.art = newTiles.length;
                newTiles.push(...tiles.slice(art, art + length));
                newTilesIndices.push(...objTileIndices);
            }

        });

    });

    tiles.replace(newTiles);

}
