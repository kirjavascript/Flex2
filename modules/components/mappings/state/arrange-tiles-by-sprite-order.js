import { environment } from '#store/environment';
import range from 'lodash/range';
import { arrayIndexOf } from '#util/array-index-of';

export function arrangeTilesBySpriteOrder() {

    let newTiles = [];
    let newTilesIndicies = [];

    const { tiles, mappings, dplcs, config: { dplcsEnabled } } = environment;

    (dplcsEnabled ? dplcs : mappings).forEach((objList, index) => {

        objList.forEach((obj) => {
            const length = obj.size || obj.width * obj.height;
            const { art } = obj;

            const objTileIndicies = range(art, art +length);
            const indiciesTileIndex = arrayIndexOf(objTileIndicies, newTilesIndicies);

            if (indiciesTileIndex != -1) {
                obj.art = indiciesTileIndex;
            }
            else {
                obj.art = newTiles.length;
                newTiles.push(...tiles.slice(art, art + length));
                newTilesIndicies.push(...objTileIndicies);
            }

        });

    });

    tiles.replace(newTiles);

}
