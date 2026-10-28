// planning and generating imported frames, kept apart from the store so the
// import worker can run it. what it needs to know about the art comes in a
// scene: { art: { keys, positions }, nextTile, dplcsEnabled, palettes, templates }
// where palettes[line] is the colours of that palette line as drawn
import { ALPHA_CUTOFF, generateMappings } from './generate-mappings';

function readTile(buffer, x, y, palette) {
    const { data, width, height } = buffer;
    const pixels = [];
    for (let pY = y; pY < y + 8; pY++) {
        for (let pX = x; pX < x + 8; pX++) {
            const j = (pY * width + pX) * 4;
            if (pX < 0 || pY < 0 || pX >= width || pY >= height || data[j + 3] <= ALPHA_CUTOFF) {
                pixels.push(0);
                continue;
            }
            // colours are matched to the palette beforehand, but going through
            // the canvas can nudge them, so fall back to the nearest
            let nearest = 1, distance = Infinity;
            for (let p = 1; p < palette.length; p++) {
                const [R, G, B] = palette[p];
                const d = (R - data[j]) ** 2 + (G - data[j + 1]) ** 2 + (B - data[j + 2]) ** 2;
                if (d < distance) {
                    nearest = p;
                    distance = d;
                    if (!d) break;
                }
            }
            pixels.push(nearest);
        }
    }
    return pixels;
}

export const tileKey = (tile) => String.fromCharCode(...tile);
const hflipTile = (tile) => tile.map((_, i) => tile[(i & ~7) | (7 - (i & 7))]);
const vflipTile = (tile) => tile.map((_, i) => tile[((7 - (i >> 3)) << 3) | (i & 7)]);

// the tiles a piece needs stored in VRAM to be drawn with the given flips:
// the hardware reverses the order of columns/rows and flips each tile
export function storedTiles(display, width, height, hflip, vflip) {
    const stored = [];
    for (let c = 0; c < width; c++) {
        for (let r = 0; r < height; r++) {
            let tile = display[(hflip ? width - 1 - c : c) * height + (vflip ? height - 1 - r : r)];
            if (hflip) tile = hflipTile(tile);
            if (vflip) tile = vflipTile(tile);
            stored.push(tile);
        }
    }
    return stored;
}

const flipVariants = [[false, false], [true, false], [false, true], [true, true]];

export function addKey({ keys, positions }, index, k) {
    keys[index] = k;
    positions.has(k) ? positions.get(k).push(index) : positions.set(k, [index]);
}

// an index that can be added to without touching the one it starts from, so
// one indexed art can be planned against many times
function overlay(base) {
    const keys = [];
    const positions = new Map();
    return {
        keyAt: (i) => keys[i] ?? base.keys[i],
        positionsOf: (k) => [...(base.positions.get(k) || []), ...(positions.get(k) || [])],
        add: (index, k) => {
            keys[index] = k;
            positions.has(k) ? positions.get(k).push(index) : positions.set(k, [index]);
        },
    };
}

// where a run of keys starts in an index, if anywhere
function findRun(index, run) {
    return index.positionsOf(run[0]).find((start) => run.every((k, i) => index.keyAt(start + i) === k));
}

// 16 is what most formats hold; bigger formats merge entries on save
const DPLC_MAX_SIZE = 16;

// number of DPLC entries a list of source tiles needs: runs of up to DPLC_MAX_SIZE
function dplcEntries(sources) {
    let entries = 0, size = 0;
    sources.forEach((art, i) => {
        if (i && size < DPLC_MAX_SIZE && sources[i - 1] + 1 == art) {
            size++;
        } else {
            entries++;
            size = 1;
        }
    });
    return entries;
}

// the same runs as entries, merged the way concatDPLCs merges them
function mergeDPLCs(sources) {
    const dplcs = [];
    sources.forEach((art, i) => {
        const last = dplcs[dplcs.length - 1];
        if (i && last.size < DPLC_MAX_SIZE && last.art + last.size == art) last.size++;
        else dplcs.push({ art, size: 1, metadata: {} });
    });
    return dplcs;
}

// works out which tiles and pieces a sprite needs, reusing what already exists
// in the art. nothing is written, so the result can also be previewed.
// pieces may carry a buffer to read from and a template whose tiles they use
export function planFrame(scene, buffer, newMappings, paletteLine) {
    const { art, nextTile, dplcsEnabled, palettes } = scene;

    const index = overlay(art);
    const newTiles = [];
    const pieces = [];

    // without DPLCs the art is what is in VRAM; with them, the frame's VRAM is
    // the tiles its DPLCs load, in order
    const vram = overlay({ keys: [], positions: new Map() });
    let vramSize = 0;
    const sources = [];

    const appendTile = (tile, k) => {
        const at = nextTile + newTiles.length;
        newTiles.push(tile);
        index.add(at, k);
        return at;
    };

    newMappings.forEach(({ x, y, width, height, template, hflip, vflip, source }) => {
        let display;
        if (template) {
            // drawn flipped, the template's tiles land as this piece
            display = storedTiles(template.display, width, height, hflip, vflip);
        } else {
            const palette = palettes[paletteLine];
            display = [];
            for (let c = 0; c < width; c++) {
                for (let r = 0; r < height; r++) {
                    display.push(readTile(source || buffer, x + c * 8, y + r * 8, palette));
                }
            }
        }

        const variants = flipVariants.map(([hflip, vflip]) => {
            const tiles = storedTiles(display, width, height, hflip, vflip);
            return { hflip, vflip, tiles, keys: tiles.map(tileKey) };
        });

        const piece = { left: x, top: y, width, height, palette: paletteLine, metadata: {} };

        if (!dplcsEnabled) {
            for (const variant of variants) {
                const start = findRun(index, variant.keys);
                if (start !== undefined) {
                    pieces.push({ ...piece, art: start, hflip: variant.hflip, vflip: variant.vflip });
                    return;
                }
            }
            const [{ tiles, keys }] = variants;
            const start = nextTile + newTiles.length;
            tiles.forEach((tile, i) => appendTile(tile, keys[i]));
            pieces.push({ ...piece, art: start, hflip: false, vflip: false });
            return;
        }

        // the frame already loads these tiles, so the piece can share them
        for (const variant of variants) {
            const start = findRun(vram, variant.keys);
            if (start !== undefined) {
                pieces.push({ ...piece, art: start, hflip: variant.hflip, vflip: variant.vflip });
                return;
            }
        }

        // otherwise load tiles from wherever they already are in the art,
        // unless splitting the DPLCs up to do so costs more than it saves
        const entriesBefore = dplcEntries(sources);
        const cost = (picked) => {
            let next = nextTile + newTiles.length;
            const resolved = picked.map((s) => s ?? next++);
            return (next - nextTile - newTiles.length)
                + dplcEntries([...sources, ...resolved]) - entriesBefore;
        };

        const options = variants.map((variant) => {
            let prev = sources[sources.length - 1];
            const picked = variant.keys.map((k) => {
                const found = index.positionsOf(k);
                if (!found.length) return (prev = undefined);
                // keep runs contiguous where the art allows it
                prev = prev !== undefined && found.includes(prev + 1) ? prev + 1 : found[0];
                return prev;
            });
            return { variant, picked };
        });
        options.push({ variant: variants[0], picked: variants[0].keys.map(() => undefined) });

        const { variant, picked } = options.reduce((best, option) => (
            cost(option.picked) < cost(best.picked) ? option : best
        ));

        const start = vramSize;
        picked.forEach((source, i) => {
            const k = variant.keys[i];
            sources.push(source ?? appendTile(variant.tiles[i], k));
            vram.add(vramSize++, k);
        });
        pieces.push({ ...piece, art: start, hflip: variant.hflip, vflip: variant.vflip });
    });

    const dplcs = dplcsEnabled && mergeDPLCs(sources);

    return { newTiles, pieces, dplcs };
}

// a copy of a buffer with only some of its pixels
function masked(buffer, keep) {
    const out = new ImageData(buffer.width, buffer.height);
    keep.forEach((on, i) => {
        if (on) out.data.set(buffer.data.subarray(i * 4, i * 4 + 4), i * 4);
    });
    return out;
}

// pixels a frame has in common with every other frame of its size, or nothing
// worth sharing. buffers are compared exactly, as detected
export function commonPixels(buffer, others) {
    const same = others.filter((other) => (
        other !== buffer && other.width == buffer.width && other.height == buffer.height
    ));
    if (!same.length) return;
    const { data } = buffer;
    const keep = new Uint8Array(buffer.width * buffer.height);
    let opaque = 0, shared = 0;
    for (let i = 0, j = 0; i < keep.length; i++, j += 4) {
        if (data[j + 3] <= ALPHA_CUTOFF) continue;
        opaque++;
        keep[i] = same.every((other) => (
            other.data[j] == data[j] && other.data[j + 1] == data[j + 1]
            && other.data[j + 2] == data[j + 2] && other.data[j + 3] > ALPHA_CUTOFF
        )) ? 1 : 0;
        shared += keep[i];
    }
    // a little in common is more likely chance than a shared part
    if (shared < MIN_COMMON_PIXELS || shared * 4 < opaque) return;
    return { keep, share: same.length + 1 };
}

const MIN_COMMON_PIXELS = 64;

// pad a per-pixel list the way the import canvas pads the sprite
export function padded(values, width, height, fill = 0) {
    const out = new values.constructor((width + 16) * (height + 16)).fill(fill);
    for (let y = 0; y < height; y++) {
        out.set(values.subarray(y * width, (y + 1) * width), (y + 8) * (width + 16) + 8);
    }
    return out;
}

// pieces for a frame, aimed at reusing what the art already has. common: the
// pixels it shares with other frames, as from commonPixels but padded.
// options.overlap: whether pieces may overlap
export function generateFrame(scene, buffer, type, paletteLine, common, { overlap = false } = {}) {
    const shared = common && { buffer: masked(buffer, common.keep), share: common.share };
    return generateMappings(buffer, type, {
        templates: scene.templates.filter((template) => template.palette == paletteLine),
        common: shared,
        overlap,
        cost: (pieces) => {
            const plan = planFrame(scene, buffer, pieces, paletteLine);
            let tiles = plan.newTiles.length;
            // shared pieces get reused by the rest of the group, so this
            // frame only pays its part of their tiles
            const sharedPieces = shared ? pieces.filter((p) => p.source === shared.buffer) : [];
            if (sharedPieces.length) {
                const own = planFrame(scene, buffer, sharedPieces, paletteLine).newTiles.length;
                tiles -= own * (1 - 1 / shared.share);
            }
            // fewer DPLC entries only breaks ties between equal tile counts
            return tiles + (plan.dplcs ? plan.dplcs.length / 1000 : 0);
        },
    });
}
