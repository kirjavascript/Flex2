import * as Comlink from 'comlink';
import { generateFrame, addKey } from './plan';

// the art as the importer last described it. it only grows while importing,
// so after the first frame only what was added gets sent
let scene;

Comlink.expose({
    begin({ keys, ...rest }) {
        const art = { keys: [], positions: new Map() };
        keys.forEach((k, i) => k !== undefined && addKey(art, i, k));
        scene = { ...rest, art };
    },
    update({ tiles, templates, ...rest }) {
        tiles.forEach(([i, k]) => addKey(scene.art, i, k));
        scene.templates.push(...templates);
        Object.assign(scene, rest);
    },
    generate(buffer, type, paletteLine, common, options) {
        return generateFrame(scene, buffer, type, paletteLine, common, options);
    },
});
