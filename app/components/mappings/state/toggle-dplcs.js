import { environment } from '#store/environment';
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

            // update mapping art locations
            mappings.forEach((mapping) => {
                mapping.art = dplcIndices[mapping.art];
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
