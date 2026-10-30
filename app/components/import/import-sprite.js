import { environment } from '~/store/environment';
import { getCenter } from '../mappings/state/bounds';
import { prepareMetadataFill } from '../mappings/state/fill-metadata';
import { planFrame, generateFrame, storedTiles, tileKey as keyOf, addKey } from './plan';

export { commonPixels, padded } from './plan';

// art can't change while the importer is open except by importing, so tile
// keys and templates are kept until it closes. drawing edits tiles in place,
// which is why this can't outlive it
let cache;
export function resetImportCache() {
    cache = { keys: new WeakMap(), templates: new WeakMap() };
}
resetImportCache();

const tileKey = (tile) => {
    let k = cache.keys.get(tile);
    if (k === undefined) {
        k = keyOf(tile);
        cache.keys.set(tile, k);
    }
    return k;
};

// new tiles go to the current bank, so they are drawn with its palette offset
const bankLine = () => environment.currentBank?.paletteLine || 0;

const lineOf = (paletteLine, offset = bankLine()) =>
    environment.palettesRGB[(paletteLine + offset + environment.config.artPaletteLine) % 4];

// tile keys at their absolute index, for every tile some bank holds. tiles
// offset to another palette line would draw in other colours, so aren't reused
export function indexArt() {
    const art = { keys: [], positions: new Map() };
    const lines = environment.tileLines;
    const line = bankLine();
    environment.tiles.forEach((tile, i) => {
        if (environment.bankAt(i) && lines[i] === line) addKey(art, i, tileKey(tile));
    });
    return art;
}

// what planning and generating need to know about the art. planning alone
// has no use for templates
export function getScene({ templates = true } = {}) {
    return {
        art: indexArt(),
        nextTile: environment.nextTile,
        dplcsEnabled: environment.config.dplcsEnabled,
        palettes: [0, 1, 2, 3].map((line) => lineOf(line)),
        templates: templates ? getTemplates() : [],
    };
}

export function planSprite(buffer, newMappings, paletteLine) {
    return planFrame(getScene({ templates: false }), buffer, newMappings, paletteLine);
}

// every distinct piece already in the art, as drawn, for new frames to reuse
export function getTemplates() {
    const templates = [];
    const seen = new Set();
    const line = bankLine();
    environment.sprites.forEach((sprite) => {
        let buffer, lines;
        sprite.mappings.forEach((mapping) => {
            let template = cache.templates.get(mapping);
            if (template === undefined) {
                buffer = buffer || sprite.buffer;
                lines = lines || sprite.lines;
                template = makeTemplate(mapping, buffer, lines);
                cache.templates.set(mapping, template);
            }
            if (!template || template.line !== line || seen.has(template.key)) return;
            seen.add(template.key);
            templates.push(template);
        });
    });
    return templates;
}

function makeTemplate({ art, width, height, hflip, vflip, palette }, buffer, lines) {
    const stored = [];
    const line = lines[art] || 0;
    for (let i = 0; i < width * height; i++) {
        const tile = buffer[art + i];
        if (!tile || tile.length != 64 || (lines[art + i] || 0) !== line) return null;
        stored.push(Array.from(tile));
    }
    // undo the flips: stored tiles are the flipped image of the drawn one
    const display = storedTiles(stored, width, height, hflip, vflip);
    const key = `${palette}:${width},${height}:${display.map(tileKey).join('')}`;

    const rgbOf = lineOf(palette, line);
    const W = width * 8;
    const rgb = new Int32Array(W * height * 8).fill(-1);
    display.forEach((tile, t) => {
        const c = (t / height) | 0, r = t % height;
        tile.forEach((p, i) => {
            if (!p) return;
            const [R, G, B] = rgbOf[p];
            rgb[(r * 8 + (i >> 3)) * W + c * 8 + (i & 7)] = (R << 16) | (G << 8) | B;
        });
    });
    return { width, height, palette, line, display, rgb, key };
}

// pieces for a frame, aimed at reusing what the art already has; see generateFrame
export function generateSpriteMappings(buffer, type, paletteLine, common, options) {
    return generateFrame(getScene(), buffer, type, paletteLine, common, options);
}

// a planned frame's pieces as mappings, relative to origin ({ x, y } on the
// import canvas) or else centred on the sprite
function frameMappings(plan, origin) {
    const list = plan.pieces.map((piece) => ({ priority: false, ...piece }));
    if (!list.length) return list;
    // pieces can sit at any pixel, so the centre can land between two
    const center = origin || getCenter(list);
    const cx = Math.floor(center.x);
    const cy = Math.floor(center.y);
    return list.map((mapping) => ({ ...mapping, left: mapping.left - cx, top: mapping.top - cy }));
}

// select: make it the current sprite, which scrolls the sprite list to it.
// Import All leaves that to the end. origin: see frameMappings
export function importSprite(buffer, newMappings, paletteLine, { select = true, origin } = {}) {
    const { mappings, dplcs, spriteMetadata, config: { dplcsEnabled } } = environment;
    const plan = planSprite(buffer, newMappings, paletteLine);
    const fillMetadata = prepareMetadataFill();

    if (plan.newTiles.length) environment.appendTiles(plan.newTiles);
    if (dplcsEnabled) dplcs.push(plan.dplcs);

    mappings.push(frameMappings(plan, origin));
    // without a real entry the sprite gets a throwaway {} and edits are lost
    while (spriteMetadata.length < mappings.length) {
        spriteMetadata.push({});
    }
    fillMetadata(mappings.length - 1);
    if (select) environment.config.currentSprite = mappings.length - 1;
}

