import { environment } from '#store/environment';
import { mappingState } from './index';

export function placeNewMapping() {
    if (!environment.mappings.length) {
        mappingState.newMapping.piece = void 0;
        return;
    }

    const { currentSprite: { mappings, dplcs }, config: { dplcsEnabled } } = environment;

    const { piece } = mappingState.newMapping;

    const left = (piece.left - (mappingState.x/mappingState.scale))|0;
    const top = (piece.top - (mappingState.y/mappingState.scale))|0;
    let art = piece.art;

    if (dplcsEnabled) {
        const newDPLC = {
            size: piece.width * piece.height,
            art: piece.art,
        };
        // check if dplc already exists
        const seenIndex = dplcs.findIndex(({size, art}) => (
            size >= newDPLC.size && art == newDPLC.art
        ));

        // if it does exist
        if (seenIndex != -1) {
            art = dplcs.reduce((a, c, i) => {
                if (i >= seenIndex) return a;
                else {
                    return a + c.size;
                }
            }, 0);
        }
        // otherwise
        else {
            // set to last dplc index
            art = dplcs.reduce((a, c) => {
                return a + c.size;
            }, 0);
            dplcs.push(newDPLC);
        }
    }


    mappings.push(
        Object.assign(piece, { left, top, art })
    );
    environment.config.currentTile += piece.width * piece.height;
    mappingState.newMapping.piece = void 0;
}
