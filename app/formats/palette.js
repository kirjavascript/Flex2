import chunk from 'lodash/chunk';

export const defaultPalettes = [
    ['#000', '#000', '#66a', '#aae', '#eee', '#228', '#44e', '#804', '#e00', '#c60', '#ea0', '#ec6', '#080', '#4c2', '#c4e', '#e8a'],
    ['#000', '#202', '#404', '#606', '#808', '#a0a', '#c0c', '#e0e', '#c2c', '#a2a', '#828', '#626', '#624', '#422', '#200', '#E00'],
    ['#000', '#220', '#442', '#662', '#884', '#aa4', '#cc6', '#ee6', '#cc4', '#ac4', '#8a4', '#682', '#482', '#260', '#040', '#0e0'],
    ['#000', '#022', '#044', '#066', '#088', '#0aa', '#0cc', '#0ee', '#2cc', '#2ac', '#08a', '#06a', '#048', '#028', '#006', '#00e'],
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


    for (let i = start; i < Math.min(end, 4); i++) {
        palettes[i].forEach((color) => {
            const [Z, R, G, B] = [...color];
            bytes.push(parseInt(`0${B}`, 16));
            bytes.push(parseInt(`${G}${R}`, 16));
        });
    }

    return Buffer.from(Uint8Array.from(bytes));
}
