export function bufferToTiles(buffer) {
    let tiles = [];
    const data = new Uint8Array(buffer);
    const tileQty = data.length/0x20;

    for (let i = 0; i < tileQty; i++) {
        let pixels = [];
        for (let pxlDuo = 0; pxlDuo < 0x20; pxlDuo++) {
            let duo = data[(0x20 * i) + pxlDuo];
            let [hi, lo] = [duo >> 4, duo & 0xF];
            pixels.push(hi, lo);
        }
        tiles.push(pixels);
    }

    return tiles;
}
