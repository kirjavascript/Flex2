import chunk from 'lodash/chunk';

export const defaultPalettes = [
    ['#000','#000','#22a','#24c','#44e','#66e','#eee','#aaa','#888','#444','#ea8','#a64','#e00','#800','#ea0','#e80'],
    ['#000','#202','#404','#606','#808','#a0a','#c0c','#e0e','#c0e','#a0c','#80a','#608','#406','#204','#002','#e00'],
    ['#000','#220','#440','#660','#880','#aa0','#cc0','#ee0','#ec0','#ca0','#a80','#860','#640','#420','#200','#0e0'],
    ['#000','#022','#044','#066','#088','#0aa','#0cc','#0ee','#0ec','#0ca','#0a8','#086','#064','#042','#020','#00e']
];

export function hexToMDHex(color) {
    return '#' + color.slice(1)
        .match(/../g).map((c) => parseInt(c, 16)) // toArr
        .map((c) => Math.round(c / 0x22) * 0x22) // round
        .map((c) => Math.min(c, 0xEE).toString(16)[0]) // simplify
        .join``;
}

export function buffersToColors(list) {
    let colors = [];
    list.forEach(({buffer, length}) => {
        const data = Uint8Array.from(buffer);
        for (let i = 0; i < length * 32; i+=2) {
            if (data.length <= i) {
                throw new Error('Trying to load more palettes than exist');
            }
            const [b, gr] = [
                data[i].toString(16),
                data[i+1].toString(16).padStart(2, '0'),
            ];
            const [g, r] = [...gr];
            colors.push(`#${r}${g}${b}`);

        }
    });

    return chunk(colors, 16).splice(0, 4);
}

export function colorsToBuffers(palettes, start = 0, end = 1) {
    const bytes = [];


    for (let i = start; i < end; i++) {
        palettes[i].forEach((color) => {
            const [Z, R, G, B] = [...color];
            bytes.push(parseInt(`0${B}`, 16));
            bytes.push(parseInt(`${G}${R}`, 16));
        });
    }

    return new Buffer(Uint8Array.from(bytes));
}
