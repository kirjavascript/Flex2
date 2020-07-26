import { decompress, compress } from '#formats/compression';
import flattenDeep from 'lodash/flattenDeep';
import chunk from 'lodash/chunk';
import { toJS } from 'mobx';

// a duxel is two pixels / a byte

export function bufferToTiles(buffer, compression) {
    let tiles = [];
    const data = decompress(buffer, compression);

    const tileQty = data.length/0x20;

    for (let i = 0; i < tileQty; i++) {
        let pixels = [];
        for (let duoIndex = 0; duoIndex < 0x20; duoIndex++) {
            let duxel = data[(0x20 * i) + duoIndex];
            pixels.push(duxel >> 4, duxel & 0xF);
        }
        tiles.push(pixels);
    }

    return tiles;
}

export function tilesToBuffer(tiles, compression) {

    const pixels = flattenDeep(toJS(tiles));

    const duxels = chunk(pixels, 2)
        .map(([H, L]) => (
            (H << 4) + L
        ));

    return Buffer.from(compress(Uint8Array.from(duxels), compression));
}
