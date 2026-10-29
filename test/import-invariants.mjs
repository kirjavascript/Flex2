// what every imported frame must satisfy, whatever the options. runs in the
// page: pass to page.evaluate with
//   { frames: name of a window property holding the source ImageData of each
//     frame, in import order; first: the sprite index the first frame went to;
//     overlap: whether overlapping pieces were allowed; grid: whether pieces
//     had to share one 8px grid }
// and it returns a description of each problem found, so none means it's fine
export function importProblems({ frames, first = 0, overlap, grid }) {
    const { environment, exportSprite } = window.__test__;
    const sources = window[frames];
    const problems = [];

    // opaque pixels and their colours, relative to the top left one
    const pixelsOf = ({ data, width, height }) => {
        const out = [];
        let minX = Infinity, minY = Infinity;
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
            const j = (y * width + x) * 4;
            if (data[j + 3] > 0x80) {
                out.push([x, y, data[j], data[j + 1], data[j + 2]]);
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
            }
        }
        return JSON.stringify(out.map(([x, y, ...c]) => [x - minX, y - minY, ...c]));
    };
    const apart = (a, b) => a.left >= b.left + b.width * 8 || b.left >= a.left + a.width * 8
        || a.top >= b.top + b.height * 8 || b.top >= a.top + a.height * 8;

    const tileCount = environment.tiles.length;
    const sprites = environment.sprites;
    sources.forEach((source, n) => {
        const index = first + n;
        const sprite = sprites[index];
        const say = (problem) => problems.push(`frame ${n}: ${problem}`);
        if (!sprite) return say('was not imported');
        const { mappings, dplcs } = sprite;

        mappings.forEach((piece, i) => {
            // scripts read and write it, as reading always sets it
            if (!piece.metadata || typeof piece.metadata != 'object') say(`piece ${i} has no metadata`);
            if (!(piece.width >= 1 && piece.width <= 4 && piece.height >= 1 && piece.height <= 4)) {
                say(`piece ${i} is ${piece.width}x${piece.height} tiles`);
            }
            if (!Number.isInteger(piece.left) || !Number.isInteger(piece.top)) say(`piece ${i} is off the pixel grid`);
            // with DPLCs, art counts in the tiles the frame loads
            const reach = dplcs ? dplcs.reduce((a, d) => a + d.size, 0) : tileCount;
            if (piece.art < 0 || piece.art + piece.width * piece.height > reach) {
                say(`piece ${i} uses tiles ${piece.art}-${piece.art + piece.width * piece.height - 1} of ${reach}`);
            }
            if (!overlap) {
                mappings.forEach((other, j) => {
                    if (j > i && !apart(piece, other)) say(`pieces ${i} and ${j} overlap`);
                });
            }
        });

        if (grid && mappings.some((p) => (p.left - mappings[0].left) % 8 || (p.top - mappings[0].top) % 8)) {
            say('pieces are off the 8px grid');
        }

        if (dplcs) {
            dplcs.forEach(({ art, size, metadata }, i) => {
                if (!metadata || typeof metadata != 'object') say(`DPLC ${i} has no metadata`);
                if (!(size >= 1 && size <= 16)) say(`DPLC ${i} loads ${size} tiles`);
                if (art < 0 || art + size > tileCount) say(`DPLC ${i} loads tiles ${art}-${art + size - 1} of ${tileCount}`);
            });
        }

        const canvas = exportSprite({ buffer: sprite.buffer, mappings });
        const redrawn = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
        if (mappings.length && pixelsOf(redrawn) !== pixelsOf(source)) say('does not redraw to its source');
    });
    return problems;
}
