import { environment } from '~/store/environment';

import { concatDPLCs } from './concat-dplcs';
import { dplcOptions } from './dplc-options';

// writers store identical frames once, so these say when two frames may be sharing bytes
const pieceKey = ({ left, top, width, height, art, hflip, vflip, palette, priority }) =>
    [left, top, width, height, art, !!hflip, !!vflip, palette, !!priority].join();
const mappingKey = (mappings) => mappings.map(pieceKey).join('|');
const dplcKey = (dplcs) => dplcs.map(({ art, size }) => `${art},${size}`).join('|');

function isShared(index) {
    const { mappings, dplcs } = environment;
    const map = mappingKey(mappings[index]);
    const dplc = dplcKey(dplcs[index]);
    return mappings.some((other, i) => i !== index && (
        mappingKey(other) === map || dplcKey(dplcs[i] || []) === dplc
    ));
}

export function optimizeCurrentDPLCs() {
    const { currentSprite: { mappings, dplcs, index }, config } = environment;

    if (config.dplcsEnabled && dplcs.length) {
        optimizeDPLCs(mappings, dplcs);
        if (!isShared(index)) optimizeDPLCs(mappings, dplcs, { artOrder: true });
    }
}

export function optimizeAllDPLCs() {
    const { mappings, dplcs } = environment;
    mappings.forEach((sprite, i) => optimizeDPLCs(sprite, dplcs[i]));

    const counts = (keys) => keys.reduce((acc, key) => acc.set(key, (acc.get(key) || 0) + 1), new Map());
    const mappingKeys = mappings.map(mappingKey);
    const dplcKeys = dplcs.map(dplcKey);
    const mappingCounts = counts(mappingKeys);
    const dplcCounts = counts(dplcKeys);

    mappings.forEach((sprite, i) => {
        if (mappingCounts.get(mappingKeys[i]) === 1 && dplcCounts.get(dplcKeys[i]) === 1) {
            optimizeDPLCs(sprite, dplcs[i], { artOrder: true });
        }
    });
}

const consecutive = (list) => list.every((tile, i) => !i || tile === list[i - 1] + 1);

function findRun(list, haystack) {
    for (let i = 0; i + list.length <= haystack.length; i++) {
        if (list.every((tile, j) => haystack[i + j] === tile)) return i;
    }
    return -1;
}

// longest end of `order` that `list` starts with
function overlap(list, order) {
    for (let size = Math.min(list.length - 1, order.length); size > 0; size--) {
        if (list.slice(0, size).every((tile, i) => order[order.length - size + i] === tile)) return size;
    }
    return 0;
}

// piece order gives frames with the same pieces the same indices, so their data
// can be shared. art order loads each tile once and lets tiles next to each other
// in the art share an entry whichever pieces use them, so with artOrder it is
// used when it needs fewer entries. pieces made of tiles from different parts of
// the art keep them as a block either way
export function optimizeDPLCs(mappings, dplcs, { artOrder = false } = {}) {
    const tiles = [];
    const tileMetadata = new Map();

    dplcs.forEach(({ art, size, metadata }) => {
        for (let i = 0; i < size; i++) {
            tiles.push(art + i);
            if (!tileMetadata.has(art + i)) tileMetadata.set(art + i, metadata);
        }
    });

    // pieces starting past the loaded tiles draw from VRAM and keep their index
    const loaded = mappings.filter((mapping) => mapping.art < tiles.length);
    const pieceTiles = loaded.map(({ width, height, art }) => (
        Array.from({ length: width * height }, (_, i) => tiles[art + i])
            .filter((tile) => typeof tile !== 'undefined')
    ));

    const layout = (start) => {
        const order = [...start];
        const arts = pieceTiles.map((list) => {
            const found = findRun(list, order);
            if (found !== -1) return found;
            const reused = overlap(list, order);
            const index = order.length - reused;
            order.push(...list.slice(reused));
            return index;
        });
        // each tile keeps the metadata of the entry it came from
        const entries = concatDPLCs(order.map((art) => ({
            art,
            size: 1,
            metadata: tileMetadata.get(art),
        })), dplcOptions());
        return { arts, entries };
    };

    let best = layout([]);
    if (artOrder) {
        const byArt = layout([...new Set(pieceTiles.filter(consecutive).flat())].sort((a, b) => a - b));
        if (byArt.entries.length < best.entries.length) best = byArt;
    }

    loaded.forEach((mapping, i) => {
        mapping.art = best.arts[i];
    });
    dplcs.replace(best.entries);
}
