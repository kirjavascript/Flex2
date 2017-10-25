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
        art = dplcs.reduce((a, c) => {
            return a + c.size;
        }, 0);
        dplcs.push({
            size: piece.width * piece.height,
            art: piece.art,
        });
    }


    mappings.push(
        Object.assign(piece, { left, top, art })
    );
    environment.config.currentTile += piece.width * piece.height;
    mappingState.newMapping.piece = void 0;
    mappingState.optimizeCurrentDPLCs();
}
