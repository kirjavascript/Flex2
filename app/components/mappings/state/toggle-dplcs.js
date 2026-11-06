import { environment } from '~/store/environment';
import { optimizeDPLCs } from './optimize-dplcs';
import range from 'lodash/range';

export function toggleDPLCs() {
    const { sprites, config: { dplcsEnabled } } = environment;

    if (dplcsEnabled) {
        sprites.forEach(({mappings, dplcs}) => {
            // get list dplc tiles
            const dplcIndices = [];
            dplcs.forEach(({art, size}) => {
                dplcIndices.push(...range(art, art + size));
            });

            // pieces past the loaded tiles draw whatever is already in VRAM, which
            // only DPLCs can express, so they keep their index until re-enabled
            mappings.forEach((mapping) => {
                if (mapping.art >= dplcIndices.length) {
                    mapping.outsideDPLCs = true;
                } else {
                    mapping.art = dplcIndices[mapping.art];
                }
            });

        });

        environment.dplcs.replace([]);
        environment.config.dplcsEnabled = false;
    } else {
        let newDPLCList = [];

        sprites.forEach(({mappings}) => {
            let newDPLCs = [];
            let dplcIndex = 0;

            mappings.forEach((mapping) => {
                if (mapping.outsideDPLCs) {
                    delete mapping.outsideDPLCs;
                    return;
                }
                const tileSize = mapping.width * mapping.height;

                newDPLCs.push({
                    art: mapping.art,
                    size: tileSize,
                });

                mapping.art = dplcIndex;
                dplcIndex += tileSize;

            });

            newDPLCList.push(newDPLCs);
        });

        environment.dplcs.replace(newDPLCList);
        environment.config.dplcsEnabled = true;

        // optimize & dedupe
        const { mappings, dplcs } = environment;
        for (let i = 0; i < mappings.length; i++) {
            optimizeDPLCs(mappings[i], dplcs[i]);
        }
    }
}
