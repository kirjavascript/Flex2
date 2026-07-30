import { environment } from '~/store/environment';
import range from 'lodash/range';

export function concatDPLCs(dplcs) {

    let newDPLCs = [];

    let tiles = [];

    dplcs.forEach(({art, size, metadata}) => {
        for (let i = 0; i < size; i++) {
            tiles.push({ art: art + i, metadata });
        }
    });

    let obj = {};

    tiles.forEach(({ art: num, metadata }) => {
        if (typeof obj.art == 'undefined') {
            obj.art = num;
            obj.size = 1;
            if (metadata) obj.metadata = {...metadata};
        }
        else if (obj.size == 16 || obj.art + obj.size != num) {
            newDPLCs.push(obj);
            obj = {
                art: num,
                size: 1,
            };
            if (metadata) obj.metadata = {...metadata};
        }
        else {
            obj.size++;
        }
    });
    if (typeof obj.art != 'undefined') {
        newDPLCs.push(obj);
    }

    return newDPLCs;
}
