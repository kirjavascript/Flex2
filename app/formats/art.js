import flattenDeep from 'lodash/flattenDeep';
import chunk from 'lodash/chunk';
import { toJS } from 'mobx';

// a duxel is two pixels / a byte

export function bufferToTiles(buffer) {
    let tiles = [];
    const tileQty = buffer.length/0x20;

    for (let i = 0; i < tileQty; i++) {
        let pixels = [];
        for (let duoIndex = 0; duoIndex < 0x20; duoIndex++) {
            let duxel = buffer[(0x20 * i) + duoIndex];
            pixels.push(duxel >> 4, duxel & 0xF);
        }
        tiles.push(pixels);
    }

    return tiles;
}

export function tilesToBuffer(tiles) {

    const pixels = flattenDeep(toJS(tiles));

    const duxels = chunk(pixels, 2)
        .map(([H, L]) => (
            (H << 4) + L
        ));

    return Uint8Array.from(duxels);
}
