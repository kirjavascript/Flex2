import * as Comlink from 'comlink';
import { getScene, generateSpriteMappings } from './import-sprite';

let worker;
// what the worker has been told about the art this import
let sent;

export function resetWorkerSession() {
    sent = undefined;
}

// the worker gets the whole scene once, then only tiles and templates that
// are new since. a tile that changed means the art was replaced, so it starts over
async function sync(remote) {
    const { art: { keys }, templates, ...rest } = getScene();
    const replaced = sent && sent.keys.some((k, i) => k !== undefined && keys[i] !== k);
    if (!sent || replaced) {
        await remote.begin({ keys: Array.from(keys), templates, ...rest });
        sent = { keys: Array.from(keys), templates: new Set(templates.map((t) => t.key)) };
        return;
    }
    const tiles = [];
    keys.forEach((k, i) => {
        if (sent.keys[i] === k) return;
        tiles.push([i, k]);
        sent.keys[i] = k;
    });
    const fresh = templates.filter((t) => !sent.templates.has(t.key));
    fresh.forEach((t) => sent.templates.add(t.key));
    await remote.update({ tiles, templates: fresh, ...rest });
}

// generateSpriteMappings off the main thread, so the importer stays responsive
export async function generateInWorker(buffer, type, paletteLine, common, options) {
    try {
        worker = worker || Comlink.wrap(new Worker('bundles/import-worker.js'));
        await sync(worker);
        return await worker.generate(buffer, type, paletteLine, common, options);
    } catch (error) {
        console.error(error);
        worker = undefined;
        sent = undefined;
        return generateSpriteMappings(buffer, type, paletteLine, common, options);
    }
}
