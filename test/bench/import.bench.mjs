// how spritesheet import compares to the hand made mappings it is fed renders of
// run with `npm run bench`; BENCH_COMPARE=path/to/generate-mappings.js adds a column,
// BENCH_OBJECTS picks objects by name
import { test } from '@playwright/test';
import { resolve, join } from 'path';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { pathToFileURL } from 'url';
import { buildSync } from 'esbuild';
import {
    FIXTURES, launchApp, closeApp, clearEnvironment, setFileObject, clickLoad,
    waitForMappings, waitForTiles, waitForDplcs,
} from '../helpers.mjs';

const ROOT = resolve(import.meta.dirname, '..', '..');

const objects = [
    {
        name: 'S1 Rings',
        format: 'Sonic 1.js',
        mappingsPath: 's1/maps/Rings.asm',
        artPath: 's1/art/Rings.nem',
        artCompression: 'Nemesis',
        palettePaths: [{ path: 's1/palette/Sonic-full.bin', length: 4 }],
    },
    {
        name: 'S1 Monitor',
        format: 'Sonic 1.js',
        mappingsPath: 's1/maps/Monitor.asm',
        artPath: 's1/art/Monitors.nem',
        artCompression: 'Nemesis',
        palettePaths: [{ path: 's1/palette/Sonic-full.bin', length: 4 }],
    },
    {
        name: 'S1 Sonic',
        format: 'Sonic 2.js',
        mappingsPath: 's1/maps/Sonic.asm',
        dplcsPath: 's1/maps/Sonic_DPLC.asm',
        artPath: 's1/art/Sonic.bin',
        palettePaths: [{ path: 's1/palette/Sonic-full.bin', length: 4 }],
    },
    {
        name: 'S2 Monitor',
        format: 'Sonic 2.js',
        mappingsPath: 's2/maps/obj26.asm',
        artPath: 's2/art/nemesis/Monitor.nem',
        artCompression: 'Nemesis',
        palettePaths: [{ path: 's2/palette/SonicAndTails-full.bin', length: 4 }],
    },
    {
        name: 'S2 Sonic',
        format: 'Sonic 2.js',
        mappingsPath: 's2/maps/Sonic.asm',
        dplcsPath: 's2/dplc/Sonic.asm',
        artPath: 's2/art/uncompressed/Sonic.bin',
        palettePaths: [{ path: 's2/palette/SonicAndTails-full.bin', length: 4 }],
    },
    {
        name: 'Crackers Sonic',
        format: 'Sonic Crackers.js',
        mappingsPath: 'crackers/maps/Sonic.asm',
        dplcsPath: 'crackers/maps/PLC_Sonic.asm',
        artPath: 'crackers/art/Sonic.bin',
        palettePaths: [{ path: 'crackers/palette/Primary-full.bin', length: 4 }],
    },
    {
        name: 'Crackers Arm',
        format: 'Sonic Crackers.js',
        mappingsPath: 'crackers/maps/SonicArm.asm',
        dplcsPath: 'crackers/maps/PLC_SonicArm.asm',
        artPath: 'crackers/art/SonicArm.bin',
        palettePaths: [{ path: 'crackers/palette/Primary-full.bin', length: 4 }],
    },
    {
        name: 'S3K Penguinator',
        format: 'Sonic 3&K.js',
        mappingsPath: 's3k/maps/Penguinator.asm',
        dplcsPath: 's3k/dplc/Penguinator.asm',
        artPath: 's3k/art/Penguinator.bin',
        config: { format: 'object', mapMacros: true },
    },
];

async function loadAlgorithm(entry, tmp) {
    const outfile = join(tmp, `${Math.random().toString(36).slice(2)}.mjs`);
    buildSync({
        entryPoints: [entry],
        bundle: true,
        format: 'esm',
        platform: 'node',
        outfile,
        logLevel: 'error',
        nodePaths: [resolve(ROOT, 'node_modules')],
    });
    return import(pathToFileURL(outfile).href);
}

const algorithms = async (tmp) => {
    const legacy = await loadAlgorithm(resolve(import.meta.dirname, 'legacy/generate-mappings.js'), tmp);
    const current = await loadAlgorithm(resolve(ROOT, 'app/components/import/generate-mappings.js'), tmp);
    const fakeCanvas = (buffer) => [buffer, { getImageData: () => buffer }];
    const list = [
        { name: 'legacy', run: (buffer, type) => legacy.getMappings(...fakeCanvas(buffer), type) },
        { name: 'new (no art reuse)', run: (buffer, type) => current.generateMappings(buffer, type) },
    ];
    if (process.env.BENCH_COMPARE) {
        const other = await loadAlgorithm(resolve(process.env.BENCH_COMPARE), tmp);
        list.splice(1, 0, {
            name: 'compare',
            run: (buffer, type) => (other.generateMappings
                ? other.generateMappings(buffer, type)
                : other.getMappings(...fakeCanvas(buffer), type)),
        });
    }
    return list;
};

// every frame drawn the way the importer would see it: cropped, padded by 8px
async function renderFrames(page) {
    return page.evaluate(() => {
        const { environment, exportSprite } = window.__test__;
        return environment.sprites.map(({ buffer, mappings }) => {
            if (!mappings.length) return null;
            const sprite = exportSprite({ buffer, mappings });
            const canvas = document.createElement('canvas');
            canvas.width = sprite.width + 16;
            canvas.height = sprite.height + 16;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(sprite, 8, 8);
            const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
            return {
                width,
                height,
                data: Array.from(data),
                palette: mappings[0].palette,
            };
        });
    });
}

async function originalStats(page) {
    return page.evaluate(() => {
        const { environment } = window.__test__;
        const mappings = environment.mappings;
        return {
            frames: mappings.filter((m) => m.length).length,
            pieces: mappings.reduce((a, m) => a + m.length, 0),
            placed: mappings.reduce((a, m) => a + m.reduce((b, p) => b + p.width * p.height, 0), 0),
            art: environment.tiles.length,
            dplcEntries: environment.config.dplcsEnabled
                ? environment.dplcs.reduce((a, d) => a + d.length, 0)
                : null,
        };
    });
}

// generate and import every frame the way Import All does, so later frames
// can reuse earlier ones' art, then redraw each to check it matches its source
async function importFrames(page, frames, type, options) {
    return page.evaluate(({ frames, type, options }) => {
        const { environment, importSprite, generateSpriteMappings, commonPixels, exportSprite } = window.__test__;
        environment.clearArt();
        environment.mappings.replace([]);
        environment.dplcs.replace([]);
        environment.spriteMetadata.replace([]);

        const toImageData = ({ data, width, height }) =>
            new ImageData(Uint8ClampedArray.from(data), width, height);

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

        // fewest pieces a frame could have: opaque pixels no 32x32 piece can
        // cover two of
        const lowerBound = ({ data, width, height }) => {
            const far = [];
            for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
                if (data[(y * width + x) * 4 + 3] <= 0x80) continue;
                if (far.every(([fx, fy]) => Math.abs(fx - x) >= 32 || Math.abs(fy - y) >= 32)) far.push([x, y]);
            }
            return far.length;
        };

        let mismatched = 0, pieces = 0, placed = 0, ms = 0, bound = 0, atBound = 0;
        const buffers = frames.map((frame) => frame && toImageData(frame));
        frames.forEach((frame, i) => {
            if (!frame) return;
            const buffer = buffers[i];
            const start = performance.now();
            // frames are already padded the way the importer pads them
            const common = commonPixels(buffer, buffers.filter(Boolean));
            const generated = generateSpriteMappings(buffer, type, frame.palette, common, options);
            ms += performance.now() - start;
            pieces += generated.length;
            const least = lowerBound(buffer);
            bound += least;
            if (generated.length == least) atBound++;
            placed += generated.reduce((a, p) => a + p.width * p.height, 0);
            importSprite(buffer, generated, frame.palette);
            const sprite = environment.sprites[environment.sprites.length - 1];
            const canvas = exportSprite({ buffer: sprite.buffer, mappings: sprite.mappings });
            const redrawn = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
            if (pixelsOf(redrawn) !== pixelsOf(frame)) mismatched++;
        });

        return {
            pieces,
            placed,
            art: environment.tiles.length,
            dplcEntries: environment.config.dplcsEnabled
                ? environment.dplcs.reduce((a, d) => a + d.length, 0)
                : null,
            mismatched,
            ms: Math.round(ms),
            bound,
            atBound,
        };
    }, { frames, type, options });
}

test('import benchmark', async () => {
    test.setTimeout(30 * 60_000);
    const tmp = mkdtempSync(join(tmpdir(), 'flex2-bench-'));
    const { app, page, userDataDir } = await launchApp();
    const rows = [];

    try {
        const algos = await algorithms(tmp);

        // BENCH_OBJECTS="S1 Sonic,S2 Sonic" runs just those
        const only = process.env.BENCH_OBJECTS?.split(',').map((name) => name.trim());
        for (const object of objects.filter(({ name }) => !only || only.includes(name))) {
            const fixture = (path) => path && resolve(FIXTURES, path);
            await setFileObject(page, {
                ...object,
                mappingsPath: fixture(object.mappingsPath),
                dplcsPath: fixture(object.dplcsPath),
                artPath: fixture(object.artPath),
                palettePaths: (object.palettePaths || []).map((p) => ({ ...p, path: fixture(p.path) })),
            });
            await clearEnvironment(page);
            await clickLoad(page, 'Object');
            await waitForMappings(page);
            await waitForTiles(page);
            if (object.dplcsPath) await waitForDplcs(page);

            const original = await originalStats(page);
            const frames = await renderFrames(page);
            rows.push({ object: object.name, algo: 'original', type: '', ...original });

            for (const algo of algos) {
                for (const type of ['mappings', 'tiles']) {
                    const start = performance.now();
                    const results = frames.map((frame) => frame && algo.run({
                        ...frame,
                        data: Uint8ClampedArray.from(frame.data),
                    }, type));
                    const ms = performance.now() - start;
                    const placed = results.reduce((a, r) => a + (r ? r.reduce((b, p) => b + p.width * p.height, 0) : 0), 0);
                    const row = {
                        object: object.name,
                        algo: algo.name,
                        type,
                        frames: original.frames,
                        pieces: results.reduce((a, r) => a + (r ? r.length : 0), 0),
                        placed,
                        art: placed,
                        dplcEntries: null,
                        ms: Math.round(ms),
                    };
                    rows.push(row);
                }
            }
            for (const overlap of [false, true]) {
                for (const type of ['mappings', 'tiles']) {
                    rows.push({
                        object: object.name,
                        algo: overlap ? 'new, overlap' : 'new',
                        type,
                        frames: original.frames,
                        ...await importFrames(page, frames, type, { overlap }),
                    });
                }
            }
        }
    } finally {
        await closeApp(app);
        rmSync(userDataDir, { recursive: true, force: true });
        rmSync(tmp, { recursive: true, force: true });
    }

    const cols = ['object', 'algo', 'type', 'frames', 'pieces', 'bound', 'atBound', 'placed', 'art', 'dplcEntries', 'mismatched', 'ms'];
    const table = [
        `| ${cols.join(' | ')} |`,
        `| ${cols.map(() => '---').join(' | ')} |`,
        ...rows.map((row) => `| ${cols.map((c) => row[c] ?? '').join(' | ')} |`),
    ].join('\n');
    const notes = [
        'placed: tiles covered by pieces. art: tiles in the art once imported',
        '(legacy appends every placed tile; original is the size of the art file).',
        'mismatched: frames that do not redraw to their source pixels.',
        'bound: fewest pieces the frames could have; atBound: frames that reach it.',
    ].join('\n');

    mkdirSync(resolve(ROOT, 'test-results'), { recursive: true });
    writeFileSync(resolve(ROOT, 'test-results/bench.md'), `${table}\n\n${notes}\n`);
    console.log(`\n${table}\n\n${notes}`);
});
