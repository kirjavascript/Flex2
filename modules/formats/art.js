import { decompress, compress } from '#formats/compression';

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
