import { test, expect } from '@playwright/test';
import { resolve, join } from 'path';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import {
    FIXTURES, launchApp, closeApp, clearEnvironment, setFileObject, clickLoad,
    waitForIO, clickSave, waitForMappings, waitForTiles, waitForDplcs,
} from './helpers.mjs';
import { importProblems } from './import-invariants.mjs';

const ROOT = resolve(import.meta.dirname, '..');

/** Snapshot the full environment state as JSON. */
async function snapshotEnv(page) {
    return page.evaluate(() => {
        const { environment, toJS } = window.__test__;
        return {
            mappings: toJS(environment.mappings),
            dplcs: toJS(environment.dplcs),
            tileCount: environment.tiles.length,
            palettes: toJS(environment.palettes),
        };
    });
}

async function renderSpritesheet(page) {
    const base64 = await page.evaluate(() => {
        const { environment, exportSprite } = window.__test__;
        const sprites = environment.sprites;
        if (!sprites.length) return null;

        const canvases = sprites.map(({ buffer, mappings }) =>
            exportSprite({ buffer, mappings }),
        );

        let totalWidth = 8;
        let maxHeight = 8;
        for (const c of canvases) {
            totalWidth += c.width + 8;
            maxHeight = Math.max(maxHeight, c.height + 8);
        }

        const sheet = document.createElement('canvas');
        sheet.width = totalWidth;
        sheet.height = maxHeight;
        const ctx = sheet.getContext('2d');
        let cursor = 8;

        for (const current of canvases) {
            ctx.drawImage(current, cursor, 8);
            cursor += current.width + 8;
        }

        const dataUrl = sheet.toDataURL('image/png');
        sheet.remove();
        return dataUrl.replace(/^data:image\/png;base64,/, '');
    });
    return base64 ? Buffer.from(base64, 'base64') : null;
}

/**
 * The table each sprite belongs to. Only the sprite that opens a table is
 * tagged, the ones after it belong to the same table.
 */
async function spriteTables(page) {
    return page.evaluate(() => {
        const { environment, toJS } = window.__test__;
        let table = 0;
        return toJS(environment.spriteMetadata).map(meta => {
            if (meta?.table != null && meta.table !== '') table = Number(meta.table) || 0;
            return table;
        });
    });
}

async function getErrors(page) {
    const errors = await page.locator('.error-text').allTextContents();
    return errors.filter(Boolean);
}

async function expectSnapshots(page, name) {
    const snap = await snapshotEnv(page);
    const sortKeys = (_, v) =>
        v && typeof v === 'object' && !Array.isArray(v)
            ? Object.keys(v).sort().reduce((o, k) => { o[k] = v[k]; return o; }, {})
            : v;
    expect(JSON.stringify(snap, sortKeys, 2)).toMatchSnapshot({ name: `${name}.json` });
    const png = await renderSpritesheet(page);
    if (png) {
        expect(png).toMatchSnapshot({ name: `${name}.png` });
    }
    return snap;
}

let app, page, userDataDir;
test.beforeAll(async () => { ({ app, page, userDataDir } = await launchApp()); });
test.afterAll(async () => {
    await closeApp(app);
    if (userDataDir) rmSync(userDataDir, { recursive: true, force: true });
});

test.describe('Sonic 1', () => {

    test('loads Rings mappings + Nemesis art', async () => {
        await setFileObject(page, {
            format: 'Sonic 1.js',
            mappingsPath: resolve(FIXTURES, 's1/maps/Rings.asm'),
            artPath: resolve(FIXTURES, 's1/art/Rings.nem'),
            artCompression: 'Nemesis',
            palettePaths: [{ path: resolve(FIXTURES, 's1/palette/Sonic-full.bin'), length: 4 }],
        });
        await clearEnvironment(page);
        await clickLoad(page, 'Object');
        await waitForMappings(page);
        await waitForTiles(page);

        const snap = await expectSnapshots(page, 's1-rings');
        expect(snap.mappings.length).toBe(8);
        expect(await getErrors(page)).toHaveLength(0);
    });

    test('loads Monitor mappings + art', async () => {
        await setFileObject(page, {
            format: 'Sonic 1.js',
            mappingsPath: resolve(FIXTURES, 's1/maps/Monitor.asm'),
            artPath: resolve(FIXTURES, 's1/art/Monitors.nem'),
            artCompression: 'Nemesis',
            palettePaths: [{ path: resolve(FIXTURES, 's1/palette/Sonic-full.bin'), length: 4 }],
        });
        await clearEnvironment(page);
        await clickLoad(page, 'Object');
        await waitForMappings(page);
        await waitForTiles(page);

        const snap = await expectSnapshots(page, 's1-monitor');
        expect(snap.mappings.length).toBe(12);
        expect(snap.mappings[0]).toHaveLength(1);
        expect(snap.mappings[0][0].width).toBe(4);
        expect(snap.mappings[0][0].height).toBe(4);
        expect(snap.mappings[0][0].left).toBe(-16);
        expect(snap.mappings[0][0].top).toBe(-17);
        expect(await getErrors(page)).toHaveLength(0);
    });

    test('decompresses Nemesis art', async () => {
        await setFileObject(page, {
            format: 'Sonic 1.js',
            artPath: resolve(FIXTURES, 's1/art/GHZ1.nem'),
            artCompression: 'Nemesis',
            palettePaths: [{ path: resolve(FIXTURES, 's1/palette/Sonic-full.bin'), length: 4 }],
        });
        await clearEnvironment(page);
        await clickLoad(page, 'Palettes');
        await waitForIO(page);
        await clickLoad(page, 'Art');
        await waitForTiles(page);

        const snap = await expectSnapshots(page, 's1-ghz-art');
        expect(snap.tileCount).toBeGreaterThan(10);
        expect(await getErrors(page)).toHaveLength(0);
    });

    test('round-trip: load → save → reload matches', async () => {
        const tmp = mkdtempSync(join(tmpdir(), 'flex2-test-'));
        try {
            await setFileObject(page, {
                format: 'Sonic 1.js',
                mappingsPath: resolve(FIXTURES, 's1/maps/Monitor.asm'),
                artPath: resolve(FIXTURES, 's1/art/Monitors.nem'),
                artCompression: 'Nemesis',
                palettePaths: [{ path: resolve(FIXTURES, 's1/palette/Sonic-full.bin'), length: 4 }],
            });
            await clearEnvironment(page);
            await clickLoad(page, 'Object');
            await waitForMappings(page);
            await waitForTiles(page);

            const original = await expectSnapshots(page, 's1-monitor-roundtrip-before');

            const savedMappings = join(tmp, 'mappings.bin');
            const savedArt = join(tmp, 'art.nem');
            await setFileObject(page, {
                format: 'Sonic 1.js',
                mappingsPath: savedMappings,
                artPath: savedArt,
                artCompression: 'Nemesis',
                palettePaths: [{ path: resolve(FIXTURES, 's1/palette/Sonic-full.bin'), length: 4 }],
            });
            await clickSave(page, 'Object');

            await clearEnvironment(page);
            await clickLoad(page, 'Object');
            await waitForMappings(page);
            await waitForTiles(page);

            const reloaded = await expectSnapshots(page, 's1-monitor-roundtrip-after');
            expect(reloaded.mappings).toEqual(original.mappings);
            expect(reloaded.tileCount).toBe(original.tileCount);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    test('loads Sonic sprite + DPLCs', async () => {
        await setFileObject(page, {
            format: 'Sonic 2.js',
            mappingsPath: resolve(FIXTURES, 's1/maps/Sonic.asm'),
            dplcsPath: resolve(FIXTURES, 's1/maps/Sonic_DPLC.asm'),
            artPath: resolve(FIXTURES, 's1/art/Sonic.bin'),
            artCompression: 'Uncompressed',
            palettePaths: [{ path: resolve(FIXTURES, 's1/palette/Sonic-full.bin'), length: 4 }],
        });
        await clearEnvironment(page);
        await clickLoad(page, 'Object');
        await waitForMappings(page);
        await waitForTiles(page);
        await waitForDplcs(page);

        const snap = await expectSnapshots(page, 's1-sonic');
        expect(snap.mappings.length).toBeGreaterThan(50);
        expect(snap.tileCount).toBeGreaterThan(0);
        expect(snap.dplcs.length).toBe(snap.mappings.length);
        expect(await getErrors(page)).toHaveLength(0);
    });
});

test.describe('Sonic 2', () => {

    test('loads obj26 (Monitor) mappings', async () => {
        await setFileObject(page, {
            format: 'Sonic 2.js',
            mappingsPath: resolve(FIXTURES, 's2/maps/obj26.asm'),
            artPath: resolve(FIXTURES, 's2/art/nemesis/Monitor.nem'),
            artCompression: 'Nemesis',
            palettePaths: [{ path: resolve(FIXTURES, 's2/palette/SonicAndTails-full.bin'), length: 4 }],
        });
        await clearEnvironment(page);
        await clickLoad(page, 'Object');
        await waitForMappings(page);
        await waitForTiles(page);

        const snap = await expectSnapshots(page, 's2-obj26');
        expect(snap.mappings.length).toBe(12);
        expect(snap.mappings[0][0].width).toBe(4);
        expect(snap.mappings[0][0].height).toBe(4);
        expect(snap.mappings[0][0].art).toBe(0);
        expect(await getErrors(page)).toHaveLength(0);
    });

    test('loads Sonic mappings + DPLCs', async () => {
        await setFileObject(page, {
            format: 'Sonic 2.js',
            mappingsPath: resolve(FIXTURES, 's2/maps/Sonic.asm'),
            dplcsPath: resolve(FIXTURES, 's2/dplc/Sonic.asm'),
            artPath: resolve(FIXTURES, 's2/art/uncompressed/Sonic.bin'),
            artCompression: 'Uncompressed',
            palettePaths: [{ path: resolve(FIXTURES, 's2/palette/SonicAndTails-full.bin'), length: 4 }],
        });
        await clearEnvironment(page);
        await clickLoad(page, 'Object');
        await waitForMappings(page);
        await waitForTiles(page);
        await waitForDplcs(page);

        const snap = await expectSnapshots(page, 's2-sonic');
        expect(snap.dplcs.length).toBe(snap.mappings.length);
        expect(await getErrors(page)).toHaveLength(0);
    });

    test('decompresses Kosinski art', async () => {
        await setFileObject(page, {
            format: 'Sonic 2.js',
            artPath: resolve(FIXTURES, 's2/art/kosinski/EHZ_HTZ.kos'),
            artCompression: 'Kosinski',
            palettePaths: [{ path: resolve(FIXTURES, 's2/palette/SonicAndTails-full.bin'), length: 4 }],
        });
        await clearEnvironment(page);
        await clickLoad(page, 'Palettes');
        await waitForIO(page);
        await clickLoad(page, 'Art');
        await waitForTiles(page);

        await expectSnapshots(page, 's2-kosinski-art');
        expect(await getErrors(page)).toHaveLength(0);
    });

    test('decompresses Nemesis art', async () => {
        await setFileObject(page, {
            format: 'Sonic 2.js',
            artPath: resolve(FIXTURES, 's2/art/nemesis/1Player2VS.nem'),
            artCompression: 'Nemesis',
            palettePaths: [{ path: resolve(FIXTURES, 's2/palette/SonicAndTails-full.bin'), length: 4 }],
        });
        await clearEnvironment(page);
        await clickLoad(page, 'Palettes');
        await waitForIO(page);
        await clickLoad(page, 'Art');
        await waitForTiles(page);

        await expectSnapshots(page, 's2-nemesis-art');
        expect(await getErrors(page)).toHaveLength(0);
    });

    test('round-trip: BIN save → reload matches', async () => {
        const tmp = mkdtempSync(join(tmpdir(), 'flex2-test-'));
        try {
            await setFileObject(page, {
                format: 'Sonic 2.js',
                mappingsPath: resolve(FIXTURES, 's2/maps/obj26.asm'),
                artPath: resolve(FIXTURES, 's2/art/nemesis/Monitor.nem'),
                artCompression: 'Nemesis',
                palettePaths: [{ path: resolve(FIXTURES, 's2/palette/SonicAndTails-full.bin'), length: 4 }],
            });
            await clearEnvironment(page);
            await clickLoad(page, 'Object');
            await waitForMappings(page);
            await waitForTiles(page);

            const original = await expectSnapshots(page, 's2-obj26-roundtrip-bin-before');

            await setFileObject(page, {
                format: 'Sonic 2.js',
                mappingsPath: join(tmp, 'mappings.bin'),
                artPath: join(tmp, 'art.nem'),
                artCompression: 'Nemesis',
                palettePaths: [{ path: resolve(FIXTURES, 's2/palette/SonicAndTails-full.bin'), length: 4 }],
            });
            await clickSave(page, 'Object');

            await clearEnvironment(page);
            await clickLoad(page, 'Object');
            await waitForMappings(page);
            await waitForTiles(page);

            const reloaded = await expectSnapshots(page, 's2-obj26-roundtrip-bin-after');
            expect(reloaded.mappings).toEqual(original.mappings);
            expect(reloaded.tileCount).toBe(original.tileCount);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    test('round-trip: ASM save → reload matches', async () => {
        const tmp = mkdtempSync(join(tmpdir(), 'flex2-test-'));
        try {
            await setFileObject(page, {
                format: 'Sonic 2.js',
                mappingsPath: resolve(FIXTURES, 's2/maps/obj26.asm'),
                artPath: resolve(FIXTURES, 's2/art/nemesis/Monitor.nem'),
                artCompression: 'Nemesis',
                palettePaths: [{ path: resolve(FIXTURES, 's2/palette/SonicAndTails-full.bin'), length: 4 }],
            });
            await clearEnvironment(page);
            await clickLoad(page, 'Object');
            await waitForMappings(page);
            await waitForTiles(page);

            const original = await expectSnapshots(page, 's2-obj26-roundtrip-asm-before');

            await setFileObject(page, {
                format: 'Sonic 2.js',
                mappingsPath: join(tmp, 'mappings.asm'),
                artPath: join(tmp, 'art.nem'),
                artCompression: 'Nemesis',
                palettePaths: [{ path: resolve(FIXTURES, 's2/palette/SonicAndTails-full.bin'), length: 4 }],
            });
            await clickSave(page, 'Object');

            await clearEnvironment(page);
            await clickLoad(page, 'Object');
            await waitForMappings(page);
            await waitForTiles(page);

            const reloaded = await expectSnapshots(page, 's2-obj26-roundtrip-asm-after');
            expect(reloaded.mappings).toEqual(original.mappings);
            expect(reloaded.tileCount).toBe(original.tileCount);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    test('round-trip: full Sonic object save → reload', async () => {
        const tmp = mkdtempSync(join(tmpdir(), 'flex2-test-'));
        try {
            await setFileObject(page, {
                format: 'Sonic 2.js',
                artPath: resolve(FIXTURES, 's2/art/uncompressed/Sonic.bin'),
                artCompression: 'Uncompressed',
                mappingsPath: resolve(FIXTURES, 's2/maps/Sonic.asm'),
                dplcsPath: resolve(FIXTURES, 's2/dplc/Sonic.asm'),
                palettePaths: [{ path: resolve(FIXTURES, 's2/palette/SonicAndTails-full.bin'), length: 4 }],
            });
            await clearEnvironment(page);
            await clickLoad(page, 'Object');
            await waitForMappings(page);
            await waitForTiles(page);
            await waitForDplcs(page);

            const original = await expectSnapshots(page, 's2-sonic-roundtrip-before');

            await setFileObject(page, {
                format: 'Sonic 2.js',
                mappingsPath: join(tmp, 'map.asm'),
                dplcsPath: join(tmp, 'dplc.asm'),
                artPath: join(tmp, 'art.bin'),
                artCompression: 'Uncompressed',
                palettePaths: [{ path: resolve(FIXTURES, 's2/palette/SonicAndTails-full.bin'), length: 4 }],
            });
            await clickSave(page, 'Object');

            await clearEnvironment(page);
            await clickLoad(page, 'Object');
            await waitForMappings(page);
            await waitForTiles(page);
            await waitForDplcs(page);

            const reloaded = await expectSnapshots(page, 's2-sonic-roundtrip-after');
            expect(reloaded.mappings).toEqual(original.mappings);
            expect(reloaded.dplcs).toEqual(original.dplcs);
            expect(reloaded.tileCount).toBe(original.tileCount);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });
});

test.describe('Sonic Crackers', () => {

    test('loads Sonic sprite + DPLCs', async () => {
        await setFileObject(page, {
            format: 'Sonic Crackers.js',
            mappingsPath: resolve(FIXTURES, 'crackers/maps/Sonic.asm'),
            dplcsPath: resolve(FIXTURES, 'crackers/maps/PLC_Sonic.asm'),
            artPath: resolve(FIXTURES, 'crackers/art/Sonic.bin'),
            artCompression: 'Uncompressed',
            palettePaths: [{ path: resolve(FIXTURES, 'crackers/palette/Primary-full.bin'), length: 4 }],
        });
        await clearEnvironment(page);
        await clickLoad(page, 'Object');
        await waitForMappings(page);
        await waitForTiles(page);
        await waitForDplcs(page);

        const snap = await expectSnapshots(page, 'crackers-sonic');
        expect(snap.mappings.length).toBeGreaterThan(0);
        expect(snap.tileCount).toBeGreaterThan(0);
        expect(snap.dplcs.length).toBe(snap.mappings.length);
        expect(await getErrors(page)).toHaveLength(0);
    });

    test('loads Sonic arm + DPLCs', async () => {
        await setFileObject(page, {
            format: 'Sonic Crackers.js',
            mappingsPath: resolve(FIXTURES, 'crackers/maps/SonicArm.asm'),
            dplcsPath: resolve(FIXTURES, 'crackers/maps/PLC_SonicArm.asm'),
            artPath: resolve(FIXTURES, 'crackers/art/SonicArm.bin'),
            artCompression: 'Uncompressed',
            palettePaths: [{ path: resolve(FIXTURES, 'crackers/palette/Primary-full.bin'), length: 4 }],
        });
        await clearEnvironment(page);
        await clickLoad(page, 'Object');
        await waitForMappings(page);
        await waitForTiles(page);
        await waitForDplcs(page);

        const snap = await expectSnapshots(page, 'crackers-sonic-arm');
        expect(snap.mappings.length).toBeGreaterThan(0);
        expect(snap.tileCount).toBeGreaterThan(0);
        expect(snap.dplcs.length).toBe(snap.mappings.length);
        expect(await getErrors(page)).toHaveLength(0);
    });

    test('round-trip: Sonic sprite save → reload', async () => {
        const tmp = mkdtempSync(join(tmpdir(), 'flex2-test-'));
        try {
            await setFileObject(page, {
                format: 'Sonic Crackers.js',
                mappingsPath: resolve(FIXTURES, 'crackers/maps/Sonic.asm'),
                dplcsPath: resolve(FIXTURES, 'crackers/maps/PLC_Sonic.asm'),
                artPath: resolve(FIXTURES, 'crackers/art/Sonic.bin'),
                artCompression: 'Uncompressed',
                palettePaths: [{ path: resolve(FIXTURES, 'crackers/palette/Primary-full.bin'), length: 4 }],
            });
            await clearEnvironment(page);
            await clickLoad(page, 'Object');
            await waitForMappings(page);
            await waitForTiles(page);
            await waitForDplcs(page);

            const original = await expectSnapshots(page, 'crackers-sonic-roundtrip-before');

            await setFileObject(page, {
                format: 'Sonic Crackers.js',
                mappingsPath: join(tmp, 'map.bin'),
                dplcsPath: join(tmp, 'dplc.bin'),
                artPath: join(tmp, 'art.bin'),
                artCompression: 'Uncompressed',
                palettePaths: [{ path: resolve(FIXTURES, 'crackers/palette/Primary-full.bin'), length: 4 }],
            });
            await clickSave(page, 'Object');

            await clearEnvironment(page);
            await clickLoad(page, 'Object');
            await waitForMappings(page);
            await waitForTiles(page);
            await waitForDplcs(page);

            const reloaded = await expectSnapshots(page, 'crackers-sonic-roundtrip-after');
            expect(reloaded.mappings).toEqual(original.mappings);
            expect(reloaded.dplcs).toEqual(original.dplcs);
            expect(reloaded.tileCount).toBe(original.tileCount);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });
});

test.describe('Sonic 3&K', () => {

    test('loads Penguinator mappings + DPLCs + art', async () => {
        await setFileObject(page, {
            format: 'Sonic 3&K.js',
            mappingsPath: resolve(FIXTURES, 's3k/maps/Penguinator.asm'),
            dplcsPath: resolve(FIXTURES, 's3k/dplc/Penguinator.asm'),
            artPath: resolve(FIXTURES, 's3k/art/Penguinator.bin'),
            artCompression: 'Uncompressed',
            config: { format: 'object', mapMacros: true },
        });
        await clearEnvironment(page);
        await clickLoad(page, 'Object');
        await waitForMappings(page);
        await waitForTiles(page);
        await waitForDplcs(page);

        const snap = await expectSnapshots(page, 's3k-penguinator');
        expect(snap.mappings.length).toBeGreaterThan(0);
        expect(snap.tileCount).toBeGreaterThan(0);
        expect(snap.dplcs.length).toBe(snap.mappings.length);
        expect(await getErrors(page)).toHaveLength(0);
    });

    test('loads Sonic frame tables', async () => {
        await setFileObject(page, {
            format: 'Sonic 3&K.js',
            mappingsPath: resolve(FIXTURES, 's3k/maps/Sonic.asm'),
            dplcsPath: resolve(FIXTURES, 's3k/dplc/Sonic.asm'),
            config: { format: 'sonic', mapMacros: true },
        });
        await clearEnvironment(page);
        await clickLoad(page, 'Object');
        await waitForMappings(page);
        await waitForDplcs(page);

        const snap = await snapshotEnv(page);
        // the normal table, then the super table, both auto-detected
        expect(snap.mappings.length).toBe(502);
        expect(snap.dplcs.length).toBe(502);
        expect(await getErrors(page)).toHaveLength(0);

        const tables = await spriteTables(page);
        expect(tables.filter(t => !t)).toHaveLength(251);
        expect(tables.filter(t => t === 1)).toHaveLength(251);

        // only the sprite opening the super table is tagged
        const tagged = await page.evaluate(() => {
            const { environment, toJS } = window.__test__;
            return toJS(environment.spriteMetadata)
                .map((meta, i) => (meta?.table ? i : -1))
                .filter(i => i >= 0);
        });
        expect(tagged).toEqual([251]);
    });

    for (const [ext, mapMacros] of [['asm', true], ['asm', false], ['bin', true]]) {
        const suffix = ext === 'asm' && !mapMacros ? ' (no MapMacros)' : '';
        test(`round-trip: Sonic ${ext.toUpperCase()} save \u2192 reload${suffix}`, async () => {
            const tmp = mkdtempSync(join(tmpdir(), 'flex2-test-'));
            try {
                const config = { format: 'sonic', mapMacros };
                await setFileObject(page, {
                    format: 'Sonic 3&K.js',
                    mappingsPath: resolve(FIXTURES, 's3k/maps/Sonic.asm'),
                    dplcsPath: resolve(FIXTURES, 's3k/dplc/Sonic.asm'),
                    config,
                });
                await clearEnvironment(page);
                await clickLoad(page, 'Object');
                await waitForMappings(page);
                await waitForDplcs(page);

                const original = await snapshotEnv(page);
                const originalTables = await spriteTables(page);
                expect(await getErrors(page)).toHaveLength(0);

                await setFileObject(page, {
                    format: 'Sonic 3&K.js',
                    mappingsPath: join(tmp, `map.${ext}`),
                    dplcsPath: join(tmp, `dplc.${ext}`),
                    config,
                });
                await clickSave(page, 'Object');
                expect(await getErrors(page)).toHaveLength(0);

                if (ext === 'asm') {
                    const listing = readFileSync(join(tmp, `map.${ext}`), 'utf8');
                    const dplcListing = readFileSync(join(tmp, `dplc.${ext}`), 'utf8');
                    if (mapMacros) {
                        expect(listing.match(/mappingsTable$/gm)).toHaveLength(2);
                        // both tables keep the names they were read under
                        expect(listing).toContain('Map_Sonic_: mappingsTable');
                        expect(listing).toContain('Map_SuperSonic_: mappingsTable');
                        expect(dplcListing).toContain('PLC_Sonic_: mappingsTable');
                        expect(dplcListing).toContain('PLC_SuperSonic_: mappingsTable');
                        // the twelve entries on word_147A6E share a single frame
                        expect(listing.match(/^word_147A6E:/gm)).toHaveLength(1);
                        expect(listing.match(/mappingsTableEntry\.w\tword_147A6E$/gm))
                            .toHaveLength(12);
                    } else {
                        // each table's entries are offsets from its own label
                        expect(listing).toContain('Map_SuperSonic_:');
                        expect(listing).toMatch(/dc\.w \S+-Map_Sonic_\n/);
                        expect(listing).toMatch(/dc\.w \S+-Map_SuperSonic_/);
                        expect(dplcListing).toMatch(/dc\.w \S+-PLC_SuperSonic_/);
                        expect(listing.match(/^word_147A6E: /gm)).toHaveLength(1);
                        expect(listing.match(/dc\.w word_147A6E-/g)).toHaveLength(12);
                    }
                }

                await clearEnvironment(page);
                await clickLoad(page, 'Object');
                await waitForMappings(page);
                await waitForDplcs(page);

                const reloaded = await snapshotEnv(page);
                expect(await getErrors(page)).toHaveLength(0);
                expect(reloaded.mappings).toEqual(original.mappings);
                expect(reloaded.dplcs).toEqual(original.dplcs);
                expect(await spriteTables(page)).toEqual(originalTables);
            } finally {
                rmSync(tmp, { recursive: true, force: true });
            }
        });
    }

    test('round-trip: player ASM (MapMacros) save → reload', async () => {
        const tmp = mkdtempSync(join(tmpdir(), 'flex2-test-'));
        try {
            const config = { format: 'player', mapMacros: true };
            await setFileObject(page, {
                format: 'Sonic 3&K.js',
                mappingsPath: resolve(FIXTURES, 's3k/maps/Knuckles.asm'),
                dplcsPath: resolve(FIXTURES, 's3k/dplc/Knuckles.asm'),
                config,
            });
            await clearEnvironment(page);
            await clickLoad(page, 'Object');
            await waitForMappings(page);
            await waitForDplcs(page);

            const original = await snapshotEnv(page);
            expect(await getErrors(page)).toHaveLength(0);

            await setFileObject(page, {
                format: 'Sonic 3&K.js',
                mappingsPath: join(tmp, 'map.asm'),
                dplcsPath: join(tmp, 'dplc.asm'),
                config,
            });
            await clickSave(page, 'Object');
            expect(await getErrors(page)).toHaveLength(0);

            const listing = readFileSync(join(tmp, 'map.asm'), 'utf8');
            expect(listing).toContain('spriteHeader');
            expect(readFileSync(join(tmp, 'dplc.asm'), 'utf8'))
                .toContain('s3kPlayerDplcHeader');

            await clearEnvironment(page);
            await clickLoad(page, 'Object');
            await waitForMappings(page);
            await waitForDplcs(page);

            const reloaded = await snapshotEnv(page);
            expect(await getErrors(page)).toHaveLength(0);
            expect(reloaded.mappings).toEqual(original.mappings);
            expect(reloaded.dplcs).toEqual(original.dplcs);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    test('round-trip: object ASM without MapMacros save → reload', async () => {
        const tmp = mkdtempSync(join(tmpdir(), 'flex2-test-'));
        try {
            const config = { format: 'object', mapMacros: false };
            await setFileObject(page, {
                format: 'Sonic 3&K.js',
                mappingsPath: resolve(FIXTURES, 's3k/maps/Penguinator.asm'),
                dplcsPath: resolve(FIXTURES, 's3k/dplc/Penguinator.asm'),
                config,
            });
            await clearEnvironment(page);
            await clickLoad(page, 'Object');
            await waitForMappings(page);
            await waitForDplcs(page);

            const original = await snapshotEnv(page);
            expect(await getErrors(page)).toHaveLength(0);

            await setFileObject(page, {
                format: 'Sonic 3&K.js',
                mappingsPath: join(tmp, 'map.asm'),
                dplcsPath: join(tmp, 'dplc.asm'),
                config,
            });
            await clickSave(page, 'Object');
            expect(await getErrors(page)).toHaveLength(0);

            // raw dc listing, no macros
            const listing = readFileSync(join(tmp, 'map.asm'), 'utf8');
            expect(listing).toContain('dc.');
            expect(listing).not.toContain('spritePiece');

            await clearEnvironment(page);
            await clickLoad(page, 'Object');
            await waitForMappings(page);
            await waitForDplcs(page);

            const reloaded = await snapshotEnv(page);
            expect(await getErrors(page)).toHaveLength(0);
            expect(reloaded.mappings).toEqual(original.mappings);
            expect(reloaded.dplcs).toEqual(original.dplcs);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    test('round-trip: single frame and static piece formats', async () => {
        const tmp = mkdtempSync(join(tmpdir(), 'flex2-test-'));
        try {
            // two pieces: top -8, 2x2 tiles, art 1 / 2, left -8 / 8
            const pieceA = [0xF8, 0x05, 0x00, 0x01, 0xFF, 0xF8];
            const pieceB = [0xF8, 0x05, 0x00, 0x02, 0x00, 0x08];

            for (const [variant, bytes] of [
                ['objectFrame', [0x00, 0x02, ...pieceA, ...pieceB]],
                ['objectPiece', [...pieceA, ...pieceB]],
            ]) {
                const config = { format: variant, mapMacros: true };
                const source = join(tmp, `${variant}.bin`);
                writeFileSync(source, Buffer.from(bytes));

                await setFileObject(page, {
                    format: 'Sonic 3&K.js',
                    mappingsPath: source,
                    config,
                });
                await clearEnvironment(page);
                await clickLoad(page, 'Object');
                await waitForMappings(page);

                const original = await snapshotEnv(page);
                expect(await getErrors(page)).toHaveLength(0);

                await setFileObject(page, {
                    format: 'Sonic 3&K.js',
                    mappingsPath: join(tmp, `${variant}.asm`),
                    config,
                });
                await clickSave(page, 'Object');
                expect(await getErrors(page)).toHaveLength(0);

                await clearEnvironment(page);
                await clickLoad(page, 'Object');
                await waitForMappings(page);

                const reloaded = await snapshotEnv(page);
                expect(await getErrors(page)).toHaveLength(0);
                expect(reloaded.mappings).toEqual(original.mappings);
            }
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });
});

test.describe('Extra art sources', () => {

    test('each art file keeps its own size when saved across a gap', async () => {
        const tmp = mkdtempSync(join(tmpdir(), 'flex2-test-'));
        try {
            const firstPath = join(tmp, 'first.bin');
            const extraPath = join(tmp, 'extra.bin');
            const first = readFileSync(resolve(FIXTURES, 's3k/art/Penguinator.bin'));
            const extra = Buffer.from(
                Array.from({ length: 3 * 0x20 }, (_, i) => (0x10 + i) & 0xFF),
            );
            writeFileSync(firstPath, first);
            writeFileSync(extraPath, extra);

            // the second file sits $100 bytes past the end of the first, so the
            // blank tiles between them belong to neither
            const address = (first.length + 0x100) / 0x20;

            await setFileObject(page, {
                format: 'Sonic 3&K.js',
                artPath: firstPath,
                artExtra: [{ path: extraPath, address }],
            });
            await clearEnvironment(page);
            await clickLoad(page, 'Art');
            await waitForTiles(page);

            expect(await page.evaluate(() => window.__test__.environment.tiles.length))
                .toBe(address + 3);

            // each file is its own bank, so how far it reaches is just what it
            // holds: nothing has to work out where the space between them starts
            expect(await page.evaluate(() => window.__test__.environment.art.map(
                (bank) => [bank.address, bank.tiles.length],
            ))).toEqual([[0, first.length / 0x20], [address, 3]]);

            // the gap must not be written into either file
            await clickSave(page, 'Art');
            expect(readFileSync(firstPath).equals(first)).toBe(true);
            expect(readFileSync(extraPath).equals(extra)).toBe(true);

            // and a save with the ranges already known writes the same bytes
            await clickSave(page, 'Art');
            expect(readFileSync(firstPath).equals(first)).toBe(true);
            expect(readFileSync(extraPath).equals(extra)).toBe(true);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    test('each art source sets the palette line of its bank', async () => {
        await setFileObject(page, {
            format: 'Sonic 3&K.js',
            artPath: resolve(FIXTURES, 's3k/art/Penguinator.bin'),
            artPaletteLine: 1,
            artExtra: [{ path: resolve(FIXTURES, 's3k/art/Penguinator.bin'), address: 0x200, paletteLine: 3 }],
        });
        await clearEnvironment(page);
        await clickLoad(page, 'Art');
        await waitForTiles(page);

        expect(await page.evaluate(() => window.__test__.environment.art.map(
            (bank) => bank.paletteLine,
        ))).toEqual([1, 3]);
    });

    test('a bank palette line offsets the pieces drawn from it', async () => {
        const result = await page.evaluate(() => {
            const { environment, exportSprite, toJS } = window.__test__;
            const tile = (pixel) => new Array(64).fill(pixel);
            const piece = (art) => ({
                art, width: 1, height: 1, left: 0, top: 0,
                priority: false, vflip: false, hflip: false, palette: 1,
            });

            environment.config.artPaletteLine = 0;
            environment.resetPalettes();
            environment.setArt([
                { address: 0, tiles: [tile(1), tile(1)], enabled: true, paletteLine: 0 },
                { address: 4, tiles: [tile(1)], enabled: true, paletteLine: 2 },
            ]);
            environment.mappings.replace([[piece(4)], [piece(0)]]);
            environment.dplcs.replace([[{ art: 4, size: 1 }], [{ art: 0, size: 1 }]]);
            environment.spriteMetadata.replace([{}, {}]);

            const pixel = (sprite) => Array.from(
                exportSprite(sprite).getContext('2d').getImageData(0, 0, 1, 1).data.slice(0, 3),
            );

            environment.config.dplcsEnabled = false;
            const plain = environment.sprites.map((sprite) => ({
                lines: toJS(sprite.lines).slice(0, 5),
                pixel: pixel(sprite),
            }));
            environment.config.dplcsEnabled = true;
            environment.mappings.replace([[piece(0)], [piece(0)]]);
            const viaDPLCs = environment.sprites.map((sprite) => ({
                lines: toJS(sprite.lines),
                pixel: pixel(sprite),
            }));

            return {
                plain, viaDPLCs,
                expected: [3, 1].map((line) => environment.palettesRGB[line][1]),
            };
        });

        // the gap between the banks belongs to neither and has no offset
        expect(result.plain.map(({ lines }) => lines)).toEqual([[0, 0, 0, 0, 2], [0, 0, 0, 0, 2]]);
        expect(result.viaDPLCs.map(({ lines }) => lines)).toEqual([[2], [0]]);
        expect(result.plain.map(({ pixel }) => pixel)).toEqual(result.expected);
        expect(result.viaDPLCs.map(({ pixel }) => pixel)).toEqual(result.expected);
    });
});

test.describe('DPLC entry limits', () => {

    const crackersSonic = {
        format: 'Sonic Crackers.js',
        mappingsPath: resolve(FIXTURES, 'crackers/maps/Sonic.asm'),
        dplcsPath: resolve(FIXTURES, 'crackers/maps/PLC_Sonic.asm'),
        artPath: resolve(FIXTURES, 'crackers/art/Sonic.bin'),
        artCompression: 'Uncompressed',
        palettePaths: [{ path: resolve(FIXTURES, 'crackers/palette/Primary-full.bin'), length: 4 }],
    };

    async function loadObject(page) {
        await clearEnvironment(page);
        await clickLoad(page, 'Object');
        await waitForMappings(page);
        await waitForTiles(page);
        await waitForDplcs(page);
    }

    const setUncapped = (page, value) => page.evaluate((value) => {
        window.__test__.mappingState.uncappedDPLCs = value;
    }, value);

    test.afterEach(() => setUncapped(page, true));

    // one 20 tile piece over one DPLC entry
    function optimiseLongEntry(page) {
        return page.evaluate(() => {
            const { environment, mappingState, toJS } = window.__test__;
            environment.config.dplcsEnabled = true;
            environment.mappings.replace([[{
                art: 0, width: 4, height: 4, left: 0, top: 0,
                priority: false, vflip: false, hflip: false, palette: 0,
            }, {
                art: 16, width: 4, height: 1, left: 0, top: 32,
                priority: false, vflip: false, hflip: false, palette: 0,
            }]]);
            environment.dplcs.replace([[{ art: 100, size: 20 }]]);
            environment.config.currentSprite = 0;
            mappingState.optimizeCurrentDPLCs();
            return toJS(environment.dplcs[0]);
        });
    }

    test('optimising caps entries at 16 tiles when disabled', async () => {
        await setUncapped(page, false);
        expect(await optimiseLongEntry(page)).toEqual([
            { art: 100, size: 16 },
            { art: 116, size: 4 },
        ]);
    });

    test('optimising leaves entries uncapped by default', async () => {
        expect(await optimiseLongEntry(page)).toEqual([
            { art: 100, size: 20 },
        ]);
    });

    test('a Crackers frame over 16 tiles stays one entry', async () => {
        await setFileObject(page, crackersSonic);
        await loadObject(page);

        const result = await page.evaluate(() => {
            const { environment, mappingState, toJS } = window.__test__;
            const [entry] = toJS(environment.dplcs[0]);
            environment.dplcs[0].replace([
                { ...entry, size: 16 },
                { ...entry, art: entry.art + 16, size: entry.size - 16 },
            ]);
            environment.config.currentSprite = 0;
            mappingState.optimizeCurrentDPLCs();
            return { entry, after: toJS(environment.dplcs[0]) };
        });
        expect(result.entry.size).toBeGreaterThan(16);
        expect(result.after).toEqual([result.entry]);
    });

    const optimiseMixedMetadata = (page) => page.evaluate(() => {
        const { environment, mappingState, toJS } = window.__test__;
        const piece = (art, width) => ({
            art, width, height: 1, left: 0, top: 0,
            priority: false, vflip: false, hflip: false, palette: 0,
        });
        environment.config.dplcsEnabled = true;
        environment.mappings.replace([[piece(0, 2), piece(2, 1), piece(3, 1)]]);
        environment.dplcs.replace([[
            { art: 10, size: 2, metadata: { k: 1 } },
            { art: 12, size: 1, metadata: { k: 2 } },
            { art: 13, size: 1 },
        ]]);
        environment.config.currentSprite = 0;
        mappingState.optimizeCurrentDPLCs();
        return toJS(environment.dplcs[0]);
    });

    test('optimising merges regardless of metadata when disabled', async () => {
        await setUncapped(page, false);
        expect(await optimiseMixedMetadata(page)).toEqual([
            { art: 10, size: 4, metadata: { k: 1 } },
        ]);
    });

    test('optimising keeps entries with different metadata apart by default', async () => {
        // contiguous tiles only join when the metadata agrees, and an entry
        // without any takes on its neighbour's
        expect(await optimiseMixedMetadata(page)).toEqual([
            { art: 10, size: 2, metadata: { k: 1 } },
            { art: 12, size: 2, metadata: { k: 2 } },
        ]);
    });

    test('Crackers writes a frame split at 16 tiles as one section', async () => {
        const tmp = mkdtempSync(join(tmpdir(), 'flex2-test-'));
        try {
            await setUncapped(page, false);
            await setFileObject(page, crackersSonic);
            await loadObject(page);
            const original = await snapshotEnv(page);

            const split = await page.evaluate(() => {
                const { environment, mappingState, toJS } = window.__test__;
                environment.config.currentSprite = 0;
                mappingState.optimizeCurrentDPLCs();
                return toJS(environment.dplcs[0]);
            });
            expect(split.length).toBeGreaterThan(1);

            await setFileObject(page, {
                ...crackersSonic,
                mappingsPath: join(tmp, 'map.bin'),
                dplcsPath: join(tmp, 'dplc.bin'),
                artPath: join(tmp, 'art.bin'),
            });
            await clickSave(page, 'Object');
            expect(await getErrors(page)).toHaveLength(0);
            await loadObject(page);

            const reloaded = await snapshotEnv(page);
            expect(reloaded.dplcs).toEqual(original.dplcs);
            expect(reloaded.mappings).toEqual(original.mappings);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    test('Crackers keeps a frame with several PLC sections', async () => {
        const tmp = mkdtempSync(join(tmpdir(), 'flex2-test-'));
        try {
            await setFileObject(page, crackersSonic);
            await loadObject(page);
            const original = await snapshotEnv(page);

            // each section DMAs to its own VRAM address, so they must not be merged
            const sections = await page.evaluate(() => {
                const { environment, toJS } = window.__test__;
                const [entry] = toJS(environment.dplcs[0]);
                const sections = [
                    { ...entry, size: 16 },
                    {
                        ...entry,
                        art: entry.art + 16,
                        size: entry.size - 16,
                        metadata: { ...entry.metadata, dmaDst: entry.metadata.dmaDst + 16 * 0x20 },
                    },
                ];
                environment.dplcs[0].replace(sections);
                return sections;
            });

            await setFileObject(page, {
                ...crackersSonic,
                mappingsPath: join(tmp, 'map.bin'),
                dplcsPath: join(tmp, 'dplc.bin'),
                artPath: join(tmp, 'art.bin'),
            });
            await clickSave(page, 'Object');
            expect(await getErrors(page)).toHaveLength(0);
            await loadObject(page);

            const reloaded = await snapshotEnv(page);
            expect(reloaded.dplcs[0]).toEqual(sections);
            expect(reloaded.dplcs.slice(1)).toEqual(original.dplcs.slice(1));
            expect(reloaded.mappings).toEqual(original.mappings);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    for (const ext of ['bin', 'asm']) {
        test(`Sonic 2 splits an oversized entry on ${ext} save`, async () => {
            const tmp = mkdtempSync(join(tmpdir(), 'flex2-test-'));
            const sonic2 = {
                format: 'Sonic 2.js',
                mappingsPath: resolve(FIXTURES, 's2/maps/Sonic.asm'),
                dplcsPath: resolve(FIXTURES, 's2/dplc/Sonic.asm'),
                artPath: resolve(FIXTURES, 's2/art/uncompressed/Sonic.bin'),
                artCompression: 'Uncompressed',
                palettePaths: [{ path: resolve(FIXTURES, 's2/palette/SonicAndTails-full.bin'), length: 4 }],
            };
            try {
                await setFileObject(page, sonic2);
                await loadObject(page);
                const original = await snapshotEnv(page);
                const index = original.dplcs.findIndex((entries) => entries.length);
                const [first, ...rest] = original.dplcs[index];

                await page.evaluate(({ index, first }) => {
                    window.__test__.environment.dplcs[index][0].size = first.size + 16;
                }, { index, first });

                await setFileObject(page, {
                    ...sonic2,
                    mappingsPath: join(tmp, `map.${ext}`),
                    dplcsPath: join(tmp, `dplc.${ext}`),
                    artPath: join(tmp, 'art.bin'),
                });
                await clickSave(page, 'Object');
                expect(await getErrors(page)).toHaveLength(0);
                await loadObject(page);

                const reloaded = await snapshotEnv(page);
                expect(reloaded.dplcs[index]).toEqual([
                    { ...first, size: 16 },
                    { ...first, art: first.art + 16, size: first.size },
                    ...rest,
                ]);
                const others = (dplcs) => dplcs.filter((_, i) => i !== index);
                expect(others(reloaded.dplcs)).toEqual(others(original.dplcs));
                expect(reloaded.mappings).toEqual(original.mappings);
            } finally {
                rmSync(tmp, { recursive: true, force: true });
            }
        });
    }
});

test.describe('Settings tab', () => {
    const mainTabs = (page) => page.evaluate(() => {
        const { layout } = JSON.parse(localStorage.getItem('layout') || 'null')
            || { layout: { children: [] } };
        const find = (nodes) => nodes.flatMap((n) =>
            n.children?.some((c) => c.component === 'documentation')
                ? [n.children.map((c) => c.component)]
                : find(n.children || []));
        return find(layout.children)[0];
    });

    test.afterEach(() => page.locator('.flexlayout__tab_button', { hasText: /^File$/ }).click());

    test('scrolling the palette line field changes it without scrolling the tab', async () => {
        await page.locator('.flexlayout__tab_button', { hasText: /^Settings$/ }).click();
        const field = page.locator('.mapping-settings .render-line .Dropdown-placeholder');
        const scrollTop = () => field.evaluate((el) => el.closest('.flexlayout__tab').scrollTop);
        // scrolling down, since the tab starts at the top
        await page.evaluate(() => { window.__test__.environment.config.artPaletteLine = 3; });
        await field.hover();
        await page.mouse.wheel(0, 100);
        await expect(field).toHaveText('2');
        await page.waitForTimeout(200);
        expect(await scrollTop()).toBe(0);
    });

    test('settings live in their own tab', async () => {
        await page.locator('.flexlayout__tab_button', { hasText: /^Settings$/ }).click();
        await expect(page.locator('.mapping-settings')).toContainText('Autofill metadata');
        await expect(page.locator('.mapping-settings .setting-row').first()).toHaveCSS('font-size', '14px');
        const { left, right } = await page.locator('.mapping-settings').evaluate((el) => {
            const box = el.getBoundingClientRect();
            const parent = el.parentElement.getBoundingClientRect();
            return { left: box.left - parent.left, right: parent.right - box.right };
        });
        expect(Math.abs(left - right)).toBeLessThan(2);
    });

    // a layout saved without the settings tab, and optionally its version
    const stripSettings = (page, version) => page.evaluate((version) => {
        const strip = (n) => {
            if (n.children) n.children = n.children.filter((c) => c.component !== 'settings').map(strip);
            return n;
        };
        const saved = JSON.parse(localStorage.getItem('layout') || 'null');
        if (!saved) throw new Error('no saved layout');
        strip(saved.layout);
        localStorage.setItem('layout', JSON.stringify(saved));
        if (version) localStorage.setItem('layout-version', version);
        else localStorage.removeItem('layout-version');
    }, version);

    async function reload(page) {
        await page.reload();
        await page.waitForSelector('.flexlayout__tab_button');
    }

    test('an unversioned saved layout gets the settings tab before Documentation', async () => {
        await stripSettings(page, null);
        expect(await mainTabs(page)).not.toContain('settings');
        await reload(page);
        const tabs = await mainTabs(page);
        expect(tabs.indexOf('settings')).toBe(tabs.indexOf('documentation') - 1);
        expect(await page.evaluate(() => localStorage.getItem('layout-version'))).toBe('1.6.0 documentation tab');
    });

    test('migrations already applied are not run again', async () => {
        await stripSettings(page, '1.6.0 documentation tab');
        await reload(page);
        expect(await mainTabs(page)).not.toContain('settings');
        // a layout from before 1.6.0 still gets it
        await stripSettings(page, '1.4.0 mappings sub-tabs');
        await reload(page);
        expect(await mainTabs(page)).toContain('settings');
    });

    test('a saved About tab is renamed to Documentation', async () => {
        await page.evaluate(() => {
            const saved = JSON.parse(localStorage.getItem('layout'));
            const rename = (n) => {
                if (n.component === 'documentation') n.name = 'About';
                (n.children || []).forEach(rename);
            };
            rename(saved.layout);
            localStorage.setItem('layout', JSON.stringify(saved));
            localStorage.setItem('layout-version', '1.6.0 settings tab');
        });
        await reload(page);
        await expect(page.locator('.flexlayout__tab_button', { hasText: /^Documentation$/ })).toHaveCount(1);
        await expect(page.locator('.flexlayout__tab_button', { hasText: /^About$/ })).toHaveCount(0);
    });
});

test.describe('Key remapping', () => {
    const tab = (name) => page.locator('.flexlayout__tab_button', { hasText: new RegExp(`^${name}$`) });
    const keyButton = (name) => page.locator('.keys .setting-row', { hasText: name }).locator('button.key');

    test.afterEach(async () => {
        await page.evaluate(() => {
            window.__test__.keymap.resetAll();
            window.__test__.keymap.counts = true;
            window.__test__.mappingState.newMapping.active = false;
        });
        await tab('File').click();
    });

    // one selected piece, returning its hflip after the keys are pressed
    async function flipAfter(page, keys) {
        await page.evaluate(() => {
            const { environment, mappingState } = window.__test__;
            environment.config.dplcsEnabled = false;
            environment.mappings.replace([[{
                art: 0, width: 1, height: 1, left: 0, top: 0,
                priority: false, vflip: false, hflip: false, palette: 0,
            }]]);
            environment.config.currentSprite = 0;
            mappingState.selectedIndices.replace([0]);
        });
        for (const key of keys) await page.keyboard.press(key);
        return page.evaluate(() => window.__test__.environment.mappings[0][0].hflip);
    }

    test('a command remapped in settings fires on the new key, with a count', async () => {
        await tab('Settings').click();
        await keyButton('Horizontal Flip').click();
        await page.keyboard.press('j');
        await page.keyboard.press('Escape');
        await expect(keyButton('Horizontal Flip')).toHaveText('h');
        await expect(keyButton('Horizontal Flip')).not.toBeFocused();

        await keyButton('Horizontal Flip').click();
        await page.keyboard.press('k');
        await page.keyboard.press('Enter');
        await expect(keyButton('Horizontal Flip')).toHaveText('k');
        await expect(keyButton('Horizontal Flip')).not.toBeFocused();

        // leaving the field saves too
        await keyButton('Vertical Flip').click();
        await page.keyboard.press('j');
        await page.locator('.keys-header span').click();
        await expect(keyButton('Vertical Flip')).toHaveText('j');

        expect(await flipAfter(page, ['h'])).toBe(false);
        expect(await flipAfter(page, ['3', 'k'])).toBe(true);
        expect(await flipAfter(page, ['2', 'k'])).toBe(false);
    });

    test('esc still clears the count and closes windows', async () => {
        await page.evaluate(() => {
            window.__test__.mappingState.newMapping.active = true;
        });
        // the count is dropped, so h flips once rather than twice
        expect(await flipAfter(page, ['2', 'Escape', 'h'])).toBe(true);
        expect(await page.evaluate(() => window.__test__.mappingState.newMapping.active)).toBe(false);
    });

    test('the HUD shows a pending count and the coarse step', async () => {
        await tab('Mappings').click();
        const hud = page.locator('.hud').first();
        await page.keyboard.press('1');
        await page.keyboard.press('6');
        await expect(hud).toContainText('count: 16');
        await page.keyboard.press('Escape');
        await expect(hud).not.toContainText('count:');

        await page.keyboard.down('Shift');
        await expect(hud).toContainText('step: 8');
        await page.keyboard.up('Shift');
        await expect(hud).not.toContainText('step:');

        await page.keyboard.down('Shift');
        await expect(hud).toContainText('step: 8');
        await page.evaluate(() => window.dispatchEvent(new Event('blur')));
        await expect(hud).not.toContainText('step:');
        await page.keyboard.up('Shift');
    });

    test('pieces can be cycled through, even when overlapping', async () => {
        const selectedAfter = async (selected, keys) => {
            await page.evaluate((selected) => {
                const { environment, mappingState } = window.__test__;
                environment.config.dplcsEnabled = false;
                const piece = () => ({
                    art: 0, width: 1, height: 1, left: 0, top: 0,
                    priority: false, vflip: false, hflip: false, palette: 0,
                });
                environment.mappings.replace([[piece(), piece(), piece()]]);
                environment.config.currentSprite = 0;
                mappingState.selectedIndices.replace(selected);
            }, selected);
            for (const key of keys) await page.keyboard.press(key);
            return page.evaluate(() => [...window.__test__.mappingState.selectedIndices]);
        };
        expect(await selectedAfter([], ['.'])).toEqual([0]);
        expect(await selectedAfter([], [','])).toEqual([2]);
        expect(await selectedAfter([0], ['.', '.'])).toEqual([2]);
        expect(await selectedAfter([2], ['.'])).toEqual([0]);
        expect(await selectedAfter([0], [','])).toEqual([2]);
        expect(await selectedAfter([0, 1], ['.'])).toEqual([2]);
        expect(await selectedAfter([0], ['2', '.'])).toEqual([2]);
    });

    test('with counts off a digit can be bound, and is kept but inert when counts return', async () => {
        await page.evaluate(() => { window.__test__.keymap.toggleCounts(); });
        await tab('Settings').click();
        await keyButton('Horizontal Flip').click();
        await page.keyboard.press('5');
        await page.keyboard.press('Enter');
        await expect(keyButton('Horizontal Flip')).toHaveText('5');
        expect(await flipAfter(page, ['5'])).toBe(true);

        await page.evaluate(() => { window.__test__.keymap.toggleCounts(); });
        await expect(keyButton('Horizontal Flip')).toHaveText('5');
        await expect(page.locator('.keys .setting-row', { hasText: 'Horizontal Flip' }))
            .toContainText('inactive');
        expect(await flipAfter(page, ['5'])).toBe(false);
    });

    test('the render palette line can be set from keys', async () => {
        const line = () => page.evaluate(() => window.__test__.environment.config.artPaletteLine);
        await page.evaluate(() => {
            const { environment, keymap } = window.__test__;
            environment.config.artPaletteLine = 2;
            keymap.toggleCounts();
            keymap.set('paletteLine1', '1');
        });
        await page.keyboard.press('1');
        expect(await line()).toBe(1);
        await page.evaluate(() => { window.__test__.environment.config.artPaletteLine = 0; });
    });

    test('a digit cannot be recorded, it would take the count', async () => {
        await tab('Settings').click();
        await keyButton('Vertical Flip').click();
        await page.keyboard.press('5');
        await expect(page.locator('.keys .setting-row', { hasText: 'Vertical Flip' }))
            .toContainText('digit keys can\'t be used while "Use number keys as command multipliers" is enabled');
        await page.locator('.keys-header span').click();
        await expect(keyButton('Vertical Flip')).toHaveText('v');

        await page.locator('.keys-header .button', { hasText: 'reset all' }).click();
        await expect(page.locator('.keys .setting-row', { hasText: 'Vertical Flip' }))
            .not.toContainText('digit keys can\'t be used');
    });
});

test.describe('Guidelines', () => {
    test.afterEach(async () => {
        await page.evaluate(() => {
            Object.assign(window.__test__.mappingState.guidelines, { x: 0, y: 0, enabled: false });
        });
        await page.locator('.flexlayout__tab_button', { hasText: /^File$/ }).click();
    });

    test('double clicking a guideline resets it', async () => {
        await page.evaluate(() => {
            Object.assign(window.__test__.mappingState.guidelines, { x: 40, y: -30, enabled: true });
        });
        await page.locator('.flexlayout__tab_button', { hasText: /^Mappings$/ }).click();
        const at = () => page.evaluate(() => {
            const { x, y } = window.__test__.mappingState.guidelines;
            return [x, y];
        });

        await page.locator('.guidelines .x').dblclick({ position: { x: 2, y: 20 } });
        expect(await at()).toEqual([0, -30]);
        await page.locator('.guidelines .y').dblclick({ position: { x: 20, y: 2 } });
        expect(await at()).toEqual([0, 0]);
    });
});

test.describe('Eyedropper', () => {
    test.afterEach(async () => {
        await page.keyboard.up('Control');
        await page.evaluate(() => { window.__test__.mappingState.mode = 'mapping'; });
        await clearEnvironment(page);
        await page.locator('.flexlayout__tab_button', { hasText: /^File$/ }).click();
    });

    test('ctrl+click picks the colour into that side without drawing', async () => {
        await page.evaluate(() => {
            const { environment, mappingState } = window.__test__;
            environment.clearArt();
            environment.appendTiles([Array(64).fill(5)]);
            environment.mappings.replace([[{
                art: 0, width: 1, height: 1, left: 0, top: 0,
                priority: false, vflip: false, hflip: false, palette: 0,
            }]]);
            environment.config.currentSprite = 0;
            mappingState.mode = 'drawing';
            mappingState.drawTool = 'pencil';
            mappingState.drawIndexLeft = 1;
            mappingState.drawIndexRight = 2;
        });
        await page.locator('.flexlayout__tab_button', { hasText: /^Mappings$/ }).click();

        const container = page.locator('.mappingContainer');
        await page.keyboard.down('Control');
        await expect(container).toHaveClass(/picking/);
        const piece = page.locator('.mappingContainer .mapping').first();
        await piece.click();
        expect(await page.evaluate(() => window.__test__.mappingState.drawIndexRight)).toBe(2);
        await piece.click({ button: 'right' });
        await page.keyboard.up('Control');
        await expect(container).not.toHaveClass(/picking/);

        expect(await page.evaluate(() => {
            const { environment, mappingState } = window.__test__;
            return [
                mappingState.drawIndexLeft,
                mappingState.drawIndexRight,
                [...environment.tiles[0]].every((p) => p === 5),
            ];
        })).toEqual([5, 5, true]);
    });
});

test.describe('Autofill', () => {
    const place = (page, autofill) => page.evaluate((autofill) => {
        const { environment, mappingState, toJS } = window.__test__;
        mappingState.autofillMetadata = autofill;
        environment.config.dplcsEnabled = false;
        const piece = (palette, priority) => ({
            art: 0, width: 1, height: 1, left: 0, top: 0,
            priority, vflip: false, hflip: false, palette,
        });
        environment.mappings.replace([[piece(0, false), piece(2, true)]]);
        environment.config.currentSprite = 0;
        mappingState.newMapping.piece = piece(0, false);
        mappingState.placeNewMapping();
        mappingState.autofillMetadata = true;
        const [, , placed] = toJS(environment.mappings[0]);
        return { palette: placed.palette, priority: placed.priority };
    }, autofill);

    test('a placed piece takes the palette and priority of the previous one', async () => {
        expect(await place(page, true)).toEqual({ palette: 2, priority: true });
    });

    test('palette and priority are left alone when autofill is off', async () => {
        expect(await place(page, false)).toEqual({ palette: 0, priority: false });
    });
});

test.describe('Puyo Puyo', () => {

    // the DPLC style from the Mean Bean Machine disassembly: each entry names
    // the art the game loads, and the slot Flex2 shows
    const mappingsASM = `Map_Test:\tmappingsTable
${[0, 1, 2, 3, 4].map((i) => `\tmappingsTableEntry.l\tFrame_${i}`).join('\n')}
${[0, 1, 2, 3, 4].map((i) => `
Frame_${i}:\tspriteHeader
\tspritePiece\t0, 0, 2, 2, 0, 0, 0, 0, 0, 0
Frame_${i}_End`).join('\n')}
\teven
`;
    const dplcsASM = `DPLC_Test:
\t; Offset, ID
\tdplcEntry\tArtUnc_Test_0, 0
\tdplcEntry\tArtUnc_Test_2, 2\t
\tdplcEntry\tArtNem_Test, 1 ; comment
\tdplcEntry\t1
\tdc.l\t$40
\teven
`;

    test('keeps DPLC art labels through an ASM save', async () => {
        const tmp = mkdtempSync(join(tmpdir(), 'flex2-test-'));
        try {
            writeFileSync(join(tmp, 'map.asm'), mappingsASM);
            writeFileSync(join(tmp, 'dplc.asm'), dplcsASM);
            writeFileSync(join(tmp, 'art.bin'), Buffer.alloc(16 * 0x20, 0x12));
            const puyo = {
                format: 'Puyo Puyo.js',
                mappingsPath: join(tmp, 'map.asm'),
                dplcsPath: join(tmp, 'dplc.asm'),
                artPath: join(tmp, 'art.bin'),
                config: { dplcTiles: 4 },
            };
            await setFileObject(page, puyo);
            await clearEnvironment(page);
            await clickLoad(page, 'Object');
            await waitForMappings(page);
            await waitForTiles(page);
            await waitForDplcs(page);
            expect(await getErrors(page)).toHaveLength(0);

            const original = await snapshotEnv(page);
            expect(original.dplcs).toEqual([
                [{ art: 0, size: 4, metadata: { artLabel: 'ArtUnc_Test_0' } }],
                [{ art: 8, size: 4, metadata: { artLabel: 'ArtUnc_Test_2' } }],
                [{ art: 4, size: 4, metadata: { artLabel: 'ArtNem_Test' } }],
                [{ art: 4, size: 4, metadata: {} }],
                [{ art: 2, size: 4, metadata: {} }],
            ]);

            await setFileObject(page, {
                ...puyo,
                mappingsPath: join(tmp, 'map2.asm'),
                dplcsPath: join(tmp, 'dplc2.asm'),
            });
            await clickSave(page, 'Object');
            expect(await getErrors(page)).toHaveLength(0);

            const saved = readFileSync(join(tmp, 'dplc2.asm'), 'utf8');
            expect(saved).toContain('\tdplcEntry\tArtUnc_Test_0, 0\n');
            expect(saved).toContain('\tdplcEntry\tArtUnc_Test_2, 2\n');
            expect(saved).toContain('\tdplcEntry\tArtNem_Test, 1\n');
            // a missing label is named after the others
            expect(saved).toContain('\tdplcEntry\tArtUnc_Test_1, 1\n');
            expect(saved).toMatch(/\tdc\.l\t\$0*40\n/);

            await clearEnvironment(page);
            await clickLoad(page, 'Object');
            await waitForMappings(page);
            await waitForDplcs(page);
            const reloaded = await snapshotEnv(page);
            expect(reloaded.mappings).toEqual(original.mappings);
            expect(reloaded.dplcs).toEqual(original.dplcs.map((entries, i) => i === 3
                ? [{ ...entries[0], metadata: { artLabel: 'ArtUnc_Test_1' } }]
                : entries));
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });
});

test.describe('Compression', () => {
    for (const [name, file, compression, snapName] of [
        ['Nemesis (S1)', resolve(FIXTURES, 's1/art/Rings.nem'), 'Nemesis', 'compression-nemesis-s1'],
        ['Nemesis (S2)', resolve(FIXTURES, 's2/art/nemesis/1Player2VS.nem'), 'Nemesis', 'compression-nemesis-s2'],
        ['Kosinski (S2)', resolve(FIXTURES, 's2/art/kosinski/EHZ_HTZ.kos'), 'Kosinski', 'compression-kosinski-s2'],
    ]) {
        test(`${name}: decompress → tiles are valid`, async () => {
            await setFileObject(page, {
                format: 'Sonic 1.js',
                artPath: file,
                artCompression: compression,
                palettePaths: [{ path: resolve(FIXTURES, 'crackers/palette/Primary-full.bin'), length: 4 }],
            });
            await clearEnvironment(page);
            await clickLoad(page, 'Palettes');
            await waitForIO(page);
            await clickLoad(page, 'Art');
            await waitForTiles(page);

            const snap = await expectSnapshots(page, snapName);
            const valid = await page.evaluate(() => {
                const { environment } = window.__test__;
                return environment.tiles.every(t => t.length === 64);
            });
            expect(valid).toBe(true);
        });
    }

    async function loadArtExpectingError(artPath, artCompression) {
        await setFileObject(page, { format: 'Sonic 1.js', artPath, artCompression });
        await clearEnvironment(page);
        await clickLoad(page, 'Art');
        await waitForIO(page);
        return (await getErrors(page)).join();
    }

    async function expectWorkerStillWorks() {
        await setFileObject(page, {
            format: 'Sonic 1.js',
            artPath: resolve(FIXTURES, 's1/art/Rings.nem'),
            artCompression: 'Nemesis',
        });
        await clickLoad(page, 'Art');
        await waitForTiles(page);
        expect(await getErrors(page)).toHaveLength(0);
    }

    test('an empty file as Nemesis reports an error', async () => {
        const tmp = mkdtempSync(join(tmpdir(), 'flex2-test-'));
        try {
            writeFileSync(join(tmp, 'empty.nem'), Buffer.alloc(0));
            const errors = await loadArtExpectingError(join(tmp, 'empty.nem'), 'Nemesis');
            expect(errors).toContain('Nemesis decode failed');
            await expectWorkerStillWorks();
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    test('art with the wrong compression reports an error', async () => {
        const errors = await loadArtExpectingError(
            resolve(FIXTURES, 's2/art/kosinski/EHZ_HTZ.kos'),
            'Kosinski-M',
        );
        expect(errors).toContain('Kosinski-M decode failed');
        await expectWorkerStillWorks();
    });
});

test.describe('Project paths', () => {

    const openProject = (page, projectPath) => page.evaluate(async (projectPath) => {
        const { workspace, toJS } = window.__test__;
        workspace.projectPath = projectPath;
        workspace.openProject();
        for (let i = 0; i < 50 && !workspace.project.objects.length; i++) {
            await new Promise((r) => setTimeout(r, 20));
        }
        return toJS(workspace.project.objects);
    }, projectPath);

    const closeProject = (page) => page.evaluate(() => {
        window.__test__.workspace.closeProject();
    });

    test('backslashes from Windows are read and saved as /', async () => {
        const tmp = mkdtempSync(join(tmpdir(), 'flex2-test-'));
        try {
            const projectPath = join(tmp, 'project.flex.json');
            writeFileSync(projectPath, JSON.stringify({
                Flex: 2,
                name: 'windows',
                objects: [{
                    name: 'obj',
                    art: { path: 'art\\Sonic.bin', extra: [{ path: 'art\\extra\\Tails.bin' }] },
                    mappings: { path: 'map\\Sonic.asm' },
                    dplcs: { enabled: false, path: '' },
                    palettes: [{ path: 'pal\\Sonic.bin', length: 1 }],
                }],
            }));

            const [obj] = await openProject(page, projectPath);
            expect([
                obj.art.path, obj.art.extra[0].path, obj.mappings.path, obj.palettes[0].path,
            ]).toEqual(['art/Sonic.bin', 'art/extra/Tails.bin', 'map/Sonic.asm', 'pal/Sonic.bin']);

            await expect.poll(() => readFileSync(projectPath, 'utf8'), { timeout: 2000 })
                .toContain('"art/Sonic.bin"');
            expect(readFileSync(projectPath, 'utf8')).not.toContain('\\\\');
        } finally {
            await closeProject(page);
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    test('unset paths stay unset when copied between file and project', async () => {
        const tmp = mkdtempSync(join(tmpdir(), 'flex2-test-'));
        try {
            const projectPath = join(tmp, 'project.flex.json');
            writeFileSync(projectPath, JSON.stringify({ Flex: 2, name: 'empty', objects: [{ name: 'seed' }] }));
            await openProject(page, projectPath);
            await setFileObject(page, {
                format: 'Sonic 1.js',
                artPath: join(tmp, 'art', 'Sonic.bin'),
            });

            const result = await page.evaluate(() => {
                const { workspace, toJS } = window.__test__;
                workspace.fileToProject();
                const copied = toJS(workspace.project.objects[0]);
                workspace.file.art.path = 'stale';
                workspace.projectToFile(workspace.project.objects[0]);
                return { copied, file: toJS(workspace.file) };
            });

            expect(result.copied.art.path).toBe('art/Sonic.bin');
            expect(result.copied.mappings.path).toBe('');
            expect(result.copied.dplcs.path).toBe('');
            expect(result.file.art.path).toBe(join(tmp, 'art', 'Sonic.bin'));
            expect(result.file.mappings.path).toBe('');
        } finally {
            await closeProject(page);
            rmSync(tmp, { recursive: true, force: true });
        }
    });
});

test.describe('Import spritesheet', () => {

    // a 16x16 block of distinct tiles, the same block again, it mirrored, and
    // an irregular blob. returns the palette index grid of each sprite
    async function writeSheet(page, path) {
        const { png, sprites } = await page.evaluate(() => {
            const palette = window.__test__.environment.palettesRGB[0];
            const seen = new Set();
            const usable = [];
            palette.forEach((rgb, i) => {
                const key = rgb.join();
                if (i && !seen.has(key)) usable.push(i);
                seen.add(key);
            });

            const block = Array.from({ length: 16 }, (_, y) =>
                Array.from({ length: 16 }, (_, x) => usable[(x * 3 + y * 5 + (x >> 3) * 7) % usable.length]));
            const mirrored = block.map((row) => [...row].reverse());
            const blob = Array.from({ length: 30 }, (_, y) =>
                Array.from({ length: 37 }, (_, x) => (
                    ((x - 12) / 12) ** 2 + ((y - 10) / 10) ** 2 < 1
                    || ((x - 27) / 9) ** 2 + ((y - 20) / 9) ** 2 < 1
                ) ? usable[(x + y) % usable.length] : 0));

            const sprites = [block, block, mirrored, blob];
            const sheet = document.createElement('canvas');
            sheet.width = 200;
            sheet.height = 48;
            const ctx = sheet.getContext('2d');
            let left = 4;
            sprites.forEach((grid) => {
                grid.forEach((row, y) => row.forEach((index, x) => {
                    if (!index) return;
                    const [r, g, b] = palette[index];
                    ctx.fillStyle = `rgb(${r},${g},${b})`;
                    ctx.fillRect(left + x, 4 + y, 1, 1);
                }));
                left += grid[0].length + 12;
            });
            return { png: sheet.toDataURL('image/png').split(',')[1], sprites };
        });
        writeFileSync(path, Buffer.from(png, 'base64'));
        return sprites;
    }

    async function importSheet(page, path, type, { sheetWidth = 200, importAll = true } = {}) {
        await page.evaluate(([path, type]) => {
            const { importState } = window.__test__;
            importState.type = type;
            importState.openImport(path);
        }, [path, type]);
        // loading pads the sheet by 64px, which a fresh canvas never is
        await expect.poll(() => page.evaluate(() =>
            window.__test__.importState.canvas?.width,
        ), { timeout: 10_000 }).toBe(sheetWidth + 64);
        await page.evaluate(() => {
            const { importState } = window.__test__;
            importState.getBBoxes();
            importState.importSprites();
        });
        await page.waitForTimeout(100);
        if (!importAll) return;
        await page.evaluate(() => window.__test__.importState.importAll());
        await expect.poll(() => page.evaluate(() =>
            window.__test__.importState.config.active,
        ), { timeout: 15_000 }).toBe(false);
    }

    // redraw every sprite from its pieces, honouring flips, cropped to its pixels
    async function drawSprites(page, sources) {
        return page.evaluate((sources) => {
            const crop = (pixels) => {
                const ys = [...pixels.keys()].map((k) => k.split(',').map(Number));
                const minX = Math.min(...ys.map(([x]) => x)), maxX = Math.max(...ys.map(([x]) => x));
                const minY = Math.min(...ys.map(([, y]) => y)), maxY = Math.max(...ys.map(([, y]) => y));
                return Array.from({ length: maxY - minY + 1 }, (_, y) =>
                    Array.from({ length: maxX - minX + 1 }, (_, x) => pixels.get(`${x + minX},${y + minY}`) || 0));
            };
            const expected = sources.map((grid) => {
                const pixels = new Map();
                grid.forEach((row, y) => row.forEach((index, x) => index && pixels.set(`${x},${y}`, index)));
                return crop(pixels);
            });
            const drawn = window.__test__.environment.sprites.map(({ buffer, mappings }) => {
                const pixels = new Map();
                // earlier pieces are drawn in front
                [...mappings].reverse().forEach(({ art, left, top, width, height, hflip, vflip }) => {
                    for (let c = 0; c < width; c++) for (let r = 0; r < height; r++) {
                        const tile = buffer[art + c * height + r];
                        for (let i = 0; i < 64; i++) {
                            if (!tile[i]) continue;
                            let x = c * 8 + (i & 7), y = r * 8 + (i >> 3);
                            if (hflip) x = width * 8 - 1 - x;
                            if (vflip) y = height * 8 - 1 - y;
                            pixels.set(`${left + x},${top + y}`, tile[i]);
                        }
                    }
                });
                return crop(pixels);
            });
            return { drawn, expected };
        }, sources);
    }

    for (const dplcs of [false, true]) {
        for (const type of ['mappings', 'tiles']) {
            test(`imports and dedupes (${type}${dplcs ? ', DPLCs' : ''})`, async () => {
                const tmp = mkdtempSync(join(tmpdir(), 'flex2-test-'));
                try {
                    await clearEnvironment(page);
                    await page.evaluate((dplcs) => {
                        window.__test__.environment.config.dplcsEnabled = dplcs;
                    }, dplcs);
                    const path = join(tmp, 'sheet.png');
                    const sources = await writeSheet(page, path);
                    await importSheet(page, path, type);

                    const { drawn, expected } = await drawSprites(page, sources);
                    expect(drawn).toEqual(expected);

                    const snap = await snapshotEnv(page);
                    expect(snap.mappings).toHaveLength(4);
                    // the block is four distinct tiles, and the copy and mirror reuse them
                    expect(snap.mappings[1]).toEqual(snap.mappings[0]);
                    expect(snap.mappings[2]).toHaveLength(1);
                    expect(snap.mappings[2][0].hflip).toBe(true);
                    if (dplcs) {
                        expect(snap.dplcs[1]).toEqual(snap.dplcs[0]);
                        expect(snap.dplcs[2]).toEqual(snap.dplcs[0]);
                    }
                    const blobTiles = snap.mappings[3].reduce((a, c) => a + c.width * c.height, 0);
                    expect(snap.tileCount).toBeLessThanOrEqual(4 + blobTiles);
                    expect(await getErrors(page)).toHaveLength(0);
                } finally {
                    rmSync(tmp, { recursive: true, force: true });
                }
            });
        }
    }

    test('Fixed Canvas splits the sheet into square cells and lines frames up on their centres', async () => {
        const tmp = mkdtempSync(join(tmpdir(), 'flex2-test-'));
        try {
            await clearEnvironment(page);
            // 32x32 cells, the third one empty
            const squares = [[20, 4], [6, 10], null, [20, 20]];
            const path = join(tmp, 'sheet.png');
            const png = await page.evaluate((squares) => {
                const [, colour] = window.__test__.environment.palettesRGB[0];
                const sheet = document.createElement('canvas');
                sheet.width = 128;
                sheet.height = 32;
                const ctx = sheet.getContext('2d');
                ctx.fillStyle = `rgb(${colour.join()})`;
                squares.forEach((square, i) => square && ctx.fillRect(i * 32 + square[0], square[1], 8, 8));
                return sheet.toDataURL('image/png').split(',')[1];
            }, squares);
            writeFileSync(path, Buffer.from(png, 'base64'));
            // the cells are there as soon as the sheet loads, without detecting
            await page.evaluate((path) => {
                const { importState } = window.__test__;
                importState.fixedCanvas = true;
                importState.openImport(path);
            }, path);
            await expect.poll(() => page.evaluate(() => window.__test__.importState.bboxes.length)).toBe(4);
            await page.evaluate(() => window.__test__.importState.cancel());

            await importSheet(page, path, 'mappings', { sheetWidth: 128 });

            const snap = await snapshotEnv(page);
            const placed = snap.mappings.map((sprite) => sprite.map(({ left, top, width, height }) => ({ left, top, width, height })));
            expect(placed).toEqual(squares.map((square) => (square
                ? [{ left: square[0] - 16, top: square[1] - 16, width: 1, height: 1 }]
                : [])));
        } finally {
            await page.evaluate(() => { window.__test__.importState.fixedCanvas = false; });
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    test('Import All with Reuse More Tiles redraws every frame', async () => {
        const tmp = mkdtempSync(join(tmpdir(), 'flex2-test-'));
        try {
            await clearEnvironment(page);
            await page.evaluate(() => {
                const { environment, importState } = window.__test__;
                environment.config.dplcsEnabled = true;
                importState.alignToArt = true;
            });
            const path = join(tmp, 'sheet.png');
            const sources = await writeSheet(page, path);
            await importSheet(page, path, 'tiles');

            const { drawn, expected } = await drawSprites(page, sources);
            expect(drawn).toEqual(expected);
            expect(await getErrors(page)).toHaveLength(0);
        } finally {
            await page.evaluate(() => {
                const { importState } = window.__test__;
                importState.alignToArt = false;
            });
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    // grids of [r, g, b] or 0 for transparent, laid out left to right
    async function writeGrids(page, path, grids, sheetWidth) {
        const png = await page.evaluate(([grids, sheetWidth]) => {
            const sheet = document.createElement('canvas');
            sheet.width = sheetWidth;
            sheet.height = Math.max(...grids.map((g) => g.length)) + 8;
            const ctx = sheet.getContext('2d');
            let left = 4;
            grids.forEach((grid) => {
                grid.forEach((row, y) => row.forEach((rgb, x) => {
                    if (!rgb) return;
                    ctx.fillStyle = `rgb(${rgb.join()})`;
                    ctx.fillRect(left + x, 4 + y, 1, 1);
                }));
                left += grid[0].length + 12;
            });
            return sheet.toDataURL('image/png').split(',')[1];
        }, [grids, sheetWidth]);
        writeFileSync(path, Buffer.from(png, 'base64'));
    }

    // each imported sprite redrawn in colour, against its source grid
    async function redraw(page, grids) {
        return page.evaluate((grids) => {
            const { environment, exportSprite } = window.__test__;
            const crop = (points) => {
                const minX = Math.min(...points.map(([x]) => x));
                const minY = Math.min(...points.map(([, y]) => y));
                return points.map(([x, y, ...rgb]) => [x - minX, y - minY, ...rgb])
                    .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
            };
            const expected = grids.map((grid) => crop(grid.flatMap((row, y) => row
                .map((rgb, x) => rgb && [x, y, ...rgb]).filter(Boolean))));
            const drawn = environment.sprites.map(({ buffer, mappings }) => {
                const canvas = exportSprite({ buffer, mappings });
                const { data, width, height } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
                const points = [];
                for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
                    const j = (y * width + x) * 4;
                    if (data[j + 3] > 0x80) points.push([x, y, data[j], data[j + 1], data[j + 2]]);
                }
                return crop(points);
            });
            return { drawn, expected };
        }, grids);
    }

    // colours unique to each palette line, so a pixel's line is unambiguous
    async function lineColours(page) {
        return page.evaluate(() => {
            const lines = window.__test__.environment.palettesRGB;
            const count = new Map();
            lines.forEach((line) => line.slice(1).forEach((rgb) => {
                count.set(rgb.join(), (count.get(rgb.join()) || 0) + 1);
            }));
            return lines.map((line) => line.slice(1).filter((rgb) => count.get(rgb.join()) == 1)
                .filter((rgb, i, all) => all.findIndex((o) => o.join() == rgb.join()) == i));
        });
    }

    test('covers half of a symmetric sprite and mirrors it (tiles)', async () => {
        const tmp = mkdtempSync(join(tmpdir(), 'flex2-test-'));
        try {
            await clearEnvironment(page);
            const [colours] = await lineColours(page);
            // 32x16, mirrored left to right, no two tiles of a half alike
            const half = Array.from({ length: 16 }, (_, y) =>
                Array.from({ length: 16 }, (_, x) => colours[(x * 5 + y * 3 + x * y) % colours.length]));
            const grid = half.map((row) => [...row, ...[...row].reverse()]);
            const path = join(tmp, 'sheet.png');
            await writeGrids(page, path, [grid], 64);
            await importSheet(page, path, 'tiles', { sheetWidth: 64 });

            const { drawn, expected } = await redraw(page, [grid]);
            expect(drawn).toEqual(expected);
            const snap = await snapshotEnv(page);
            expect(snap.tileCount).toBe(4);
            expect(snap.mappings[0]).toHaveLength(2);
            expect(snap.mappings[0].filter((m) => m.hflip)).toHaveLength(1);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    test('worker generates the same pieces as the main thread', async () => {
        await setFileObject(page, {
            format: 'Sonic 1.js',
            mappingsPath: resolve(FIXTURES, 's1/maps/Monitor.asm'),
            artPath: resolve(FIXTURES, 's1/art/Monitors.nem'),
            artCompression: 'Nemesis',
            palettePaths: [{ path: resolve(FIXTURES, 's1/palette/Sonic-full.bin'), length: 4 }],
        });
        await clearEnvironment(page);
        await clickLoad(page, 'Object');
        await waitForMappings(page);
        await waitForTiles(page);

        const differences = await page.evaluate(async () => {
            const { environment, exportSprite, importSprite, importState, generateSpriteMappings, generateInWorker, commonPixels } = window.__test__;
            const frames = environment.sprites.map(({ buffer, mappings }) => {
                const sprite = exportSprite({ buffer, mappings });
                const canvas = document.createElement('canvas');
                canvas.width = sprite.width + 16;
                canvas.height = sprite.height + 16;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(sprite, 8, 8);
                return { image: ctx.getImageData(0, 0, canvas.width, canvas.height), palette: mappings[0].palette };
            });
            environment.clearArt();
            environment.mappings.replace([]);
            importState.reset();

            const plain = (pieces) => JSON.stringify(pieces.map(({ template, source, ...piece }) => ({
                ...piece, template: template && template.key, source: !!source,
            })));
            const images = frames.map((f) => f.image);
            let differences = 0;
            for (const type of ['tiles', 'mappings']) {
                for (const { image, palette } of frames) {
                    const common = commonPixels(image, images);
                    const sync = generateSpriteMappings(image, type, palette, common);
                    const worker = await generateInWorker(image, type, palette, common);
                    if (plain(sync) !== plain(worker)) differences++;
                    // later frames see this one's art, which the worker gets sent
                    importSprite(image, sync, palette, { select: false });
                }
            }
            importState.reset();
            return differences;
        });
        expect(differences).toBe(0);
    });

    // seeded random sprites through the generator, held to the totals it
    // reached when this was written so a change that makes it worse fails
    // real art rendered and imported again with the default options. the result
    // is kept as a snapshot, so any change to what import produces fails here
    // and has to be accepted with --update-snapshots, which shows as a diff
    const realArt = [
        { name: 's1-monitor', format: 'Sonic 1.js', mappingsPath: 's1/maps/Monitor.asm', artPath: 's1/art/Monitors.nem', artCompression: 'Nemesis', palettePaths: [{ path: 's1/palette/Sonic-full.bin', length: 4 }] },
        { name: 's1-sonic', frames: 30, format: 'Sonic 2.js', mappingsPath: 's1/maps/Sonic.asm', dplcsPath: 's1/maps/Sonic_DPLC.asm', artPath: 's1/art/Sonic.bin', palettePaths: [{ path: 's1/palette/Sonic-full.bin', length: 4 }] },
        { name: 'crackers-arm', format: 'Sonic Crackers.js', mappingsPath: 'crackers/maps/SonicArm.asm', dplcsPath: 'crackers/maps/PLC_SonicArm.asm', artPath: 'crackers/art/SonicArm.bin', palettePaths: [{ path: 'crackers/palette/Primary-full.bin', length: 4 }] },
        { name: 's3k-penguinator', format: 'Sonic 3&K.js', mappingsPath: 's3k/maps/Penguinator.asm', dplcsPath: 's3k/dplc/Penguinator.asm', artPath: 's3k/art/Penguinator.bin', config: { format: 'object', mapMacros: true } },
    ];
    for (const object of realArt) {
        test(`import output on real art: ${object.name}`, async () => {
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

            // each frame drawn the way the importer would see it
            await page.evaluate((limit) => {
                const { environment, exportSprite } = window.__test__;
                window.__realFrames = [];
                window.__realPalettes = [];
                environment.sprites.filter(({ mappings }) => mappings.length).slice(0, limit).forEach(({ buffer, mappings }) => {
                    const sprite = exportSprite({ buffer, mappings });
                    const canvas = document.createElement('canvas');
                    canvas.width = sprite.width + 16;
                    canvas.height = sprite.height + 16;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(sprite, 8, 8);
                    window.__realFrames.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
                    window.__realPalettes.push(mappings[0].palette);
                });
            }, object.frames || Infinity);

            const output = {};
            for (const type of ['mappings', 'tiles']) {
                const summary = await page.evaluate((type) => {
                    const { environment, generateSpriteMappings, importSprite, commonPixels, importState } = window.__test__;
                    environment.clearArt();
                    environment.mappings.replace([]);
                    environment.dplcs.replace([]);
                    importState.reset();
                    window.__realFrames.forEach((frame, i) => {
                        const palette = window.__realPalettes[i];
                        const common = commonPixels(frame, window.__realFrames);
                        const pieces = generateSpriteMappings(frame, type, palette, common);
                        importSprite(frame, pieces, palette, { select: false });
                    });
                    const flags = (m) => `${m.hflip ? 'h' : ''}${m.vflip ? 'v' : ''}`;
                    return {
                        art: environment.tiles.length,
                        frames: environment.sprites.map(({ mappings, dplcs }) => ({
                            pieces: mappings.map((m) => `${m.left},${m.top} ${m.width}x${m.height} @${m.art}${flags(m)} p${m.palette}`),
                            ...(dplcs && { dplcs: dplcs.map(({ art, size }) => `${art}+${size}`) }),
                        })),
                    };
                }, type);
                const problems = await page.evaluate(importProblems, { frames: '__realFrames', overlap: false });
                expect(problems, `${type} mode`).toEqual([]);
                output[type] = summary;
            }
            expect(JSON.stringify(output, null, 1)).toMatchSnapshot({ name: `import-${object.name}.json` });
        });
    }

    // Crackers keeps where each frame's DPLCs end, and where they load to, in
    // their metadata, which entries an import makes don't have
    test('imported Crackers sprites with DPLCs save and load back', async () => {
        const tmp = mkdtempSync(join(tmpdir(), 'flex2-test-'));
        try {
            const palettePaths = [{ path: resolve(FIXTURES, 'crackers/palette/Primary-full.bin'), length: 4 }];
            await setFileObject(page, {
                format: 'Sonic Crackers.js',
                mappingsPath: resolve(FIXTURES, 'crackers/maps/SonicArm.asm'),
                dplcsPath: resolve(FIXTURES, 'crackers/maps/PLC_SonicArm.asm'),
                artPath: resolve(FIXTURES, 'crackers/art/SonicArm.bin'),
                palettePaths,
            });
            await clearEnvironment(page);
            await clickLoad(page, 'Object');
            await waitForMappings(page);
            await waitForTiles(page);
            await waitForDplcs(page);

            // frames drawn, then imported into an object with nothing in it
            await page.evaluate(() => {
                const { environment, exportSprite, generateSpriteMappings, importSprite, commonPixels, importState } = window.__test__;
                const frames = environment.sprites.slice(0, 20).map(({ buffer, mappings }) => {
                    const sprite = exportSprite({ buffer, mappings });
                    const canvas = document.createElement('canvas');
                    canvas.width = sprite.width + 16;
                    canvas.height = sprite.height + 16;
                    canvas.getContext('2d').drawImage(sprite, 8, 8);
                    return { image: canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height), palette: mappings[0].palette };
                });
                environment.clearArt();
                environment.mappings.replace([]);
                environment.dplcs.replace([]);
                environment.spriteMetadata.replace([]);
                importState.reset();
                window.__crackersFrames = frames.map(({ image }) => image);
                frames.forEach(({ image, palette }) => {
                    const common = commonPixels(image, window.__crackersFrames);
                    const pieces = generateSpriteMappings(image, 'tiles', palette, common);
                    importSprite(image, pieces, palette, { select: false });
                });
            });
            expect(await page.evaluate(importProblems, { frames: '__crackersFrames', overlap: false })).toEqual([]);

            const plain = () => page.evaluate(() => {
                const { environment, toJS } = window.__test__;
                const strip = ({ metadata, ...rest }) => rest;
                return {
                    mappings: toJS(environment.mappings).map((frame) => frame.map(strip)),
                    dplcs: toJS(environment.dplcs).map((frame) => frame.map(strip)),
                    tiles: toJS(environment.tiles),
                };
            });
            const imported = await plain();

            await setFileObject(page, {
                format: 'Sonic Crackers.js',
                mappingsPath: join(tmp, 'map.bin'),
                dplcsPath: join(tmp, 'dplc.bin'),
                artPath: join(tmp, 'art.bin'),
                palettePaths,
            });
            await clickSave(page, 'Object');
            expect(await getErrors(page)).toHaveLength(0);

            await clearEnvironment(page);
            await clickLoad(page, 'Object');
            await waitForMappings(page);
            await waitForTiles(page);
            await waitForDplcs(page);

            const reloaded = await plain();
            expect(reloaded.mappings).toEqual(imported.mappings);
            expect(reloaded.dplcs).toEqual(imported.dplcs);
            expect(reloaded.tiles).toEqual(imported.tiles);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    // seeded random sheets through generating and importing, the way Import All
    // does it, under every combination of options. each frame is checked by
    // importProblems; a failure names the seed and options to reproduce it
    test('fuzz: every option combination imports correctly', async () => {
        test.setTimeout(240_000);
        await setFileObject(page, { format: 'Sonic 2.js' });
        const failures = [];
        for (const type of ['mappings', 'tiles']) for (const dplcs of [false, true])
        for (const overlap of [false, true]) for (const align of [false, true]) for (const grid of [false, true]) {
            for (let seed = 1; seed <= 8; seed++) {
                await clearEnvironment(page);
                await page.evaluate(({ type, dplcs, overlap, align, grid, seed }) => {
                    const { environment, generateSpriteMappings, importSprite, commonPixels } = window.__test__;
                    environment.config.dplcsEnabled = dplcs;
                    let state = seed * 7919;
                    const rand = () => (state = (state * 16807) % 2147483647) / 2147483647;
                    const pick = (list) => list[(rand() * list.length) | 0];
                    const colours = environment.palettesRGB[0].slice(1);

                    // a frame as rows of [r, g, b] or 0
                    const blobs = (w, h) => {
                        const grid = Array.from({ length: h }, () => Array(w).fill(0));
                        const count = 1 + ((rand() * 3) | 0);
                        for (let b = 0; b < count; b++) {
                            const cx = rand() * w, cy = rand() * h, rx = 3 + rand() * w / 2, ry = 3 + rand() * h / 2;
                            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
                                if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1) grid[y][x] = pick(colours);
                            }
                        }
                        return grid;
                    };
                    const w = 12 + ((rand() * 52) | 0), h = 12 + ((rand() * 52) | 0);
                    const first = blobs(w, h);
                    // a copy, a mirror, one sharing a part with the first, and another
                    const shared = first.map((row, y) => row.map((c, x) => (y < h / 2 ? c : 0)));
                    const extra = blobs(w, h);
                    shared.forEach((row, y) => row.forEach((c, x) => { if (!c) row[x] = extra[y][x]; }));
                    const grids = [first, first.map((row) => [...row]), first.map((row) => [...row].reverse()), shared, blobs(w, h)];

                    const toImage = (grid) => {
                        const image = new ImageData(w, h);
                        grid.forEach((row, y) => row.forEach((c, x) => {
                            if (c) image.data.set([...c, 255], (y * w + x) * 4);
                        }));
                        return image;
                    };
                    const pad = (image) => {
                        const out = new ImageData(w + 16, h + 16);
                        for (let y = 0; y < h; y++) {
                            out.data.set(image.data.subarray(y * w * 4, (y + 1) * w * 4), ((y + 8) * (w + 16) + 8) * 4);
                        }
                        return out;
                    };

                    window.__fuzzFrames = grids.map((grid) => pad(toImage(grid)));
                    const options = { overlap, align, grid };
                    window.__fuzzFrames.forEach((frame) => {
                        const common = commonPixels(frame, window.__fuzzFrames);
                        const pieces = generateSpriteMappings(frame, type, 0, common, options);
                        importSprite(frame, pieces, 0, { select: false });
                    });
                }, { type, dplcs, overlap, align, grid, seed });
                const problems = await page.evaluate(importProblems, { frames: '__fuzzFrames', overlap, grid });
                if (problems.length) failures.push({ seed, type, dplcs, overlap, align, grid, problems: problems.slice(0, 3) });
            }
        }
        expect(failures).toEqual([]);
    });

    for (const overlap of [false, true]) test(`generator covers every pixel and does not regress (overlap ${overlap ? 'on' : 'off'})`, async () => {
        const totals = await page.evaluate((overlap) => {
            const { generateMappings } = window.__test__;
            let seed = 1;
            const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
            const totals = { mappings: { pieces: 0, tiles: 0 }, tiles: { pieces: 0, tiles: 0 }, bad: 0 };
            const apart = (a, b) => a.x >= b.x + b.width * 8 || b.x >= a.x + a.width * 8
                || a.y >= b.y + b.height * 8 || b.y >= a.y + a.height * 8;
            for (let n = 0; n < 30; n++) {
                const w = 16 + (rand() * 48 | 0), h = 16 + (rand() * 48 | 0), blobs = 1 + (rand() * 3 | 0);
                const W = w + 16, H = h + 16;
                const buffer = new ImageData(W, H);
                for (let b = 0; b < blobs; b++) {
                    const cx = rand() * w, cy = rand() * h, rx = 3 + rand() * w / 3, ry = 3 + rand() * h / 3;
                    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
                        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 >= 1) continue;
                        const j = ((y + 8) * W + x + 8) * 4;
                        buffer.data.set([(x * 37 + y * 11) & 255, (x * y * 7) & 255, (y * 53) & 255, 255], j);
                    }
                }
                for (const type of ['mappings', 'tiles']) {
                    const pieces = generateMappings(buffer, type, { overlap });
                    const ok = pieces.every((p, i) => (
                        p.width >= 1 && p.width <= 4 && p.height >= 1 && p.height <= 4
                        && Number.isInteger(p.x) && Number.isInteger(p.y)
                        && (overlap || pieces.every((q, j) => j <= i || apart(p, q)))
                    ));
                    let covered = true;
                    for (let y = 0; y < H && covered; y++) for (let x = 0; x < W; x++) {
                        if (buffer.data[(y * W + x) * 4 + 3] <= 0x80) continue;
                        if (!pieces.some((p) => x >= p.x && x < p.x + p.width * 8 && y >= p.y && y < p.y + p.height * 8)) {
                            covered = false;
                            break;
                        }
                    }
                    if (!ok || !covered) totals.bad++;
                    totals[type].pieces += pieces.length;
                    totals[type].tiles += pieces.reduce((a, p) => a + p.width * p.height, 0);
                }
            }
            return totals;
        }, overlap);
        const baseline = BASELINE[overlap ? 'overlap' : 'apart'];
        expect(totals.bad).toBe(0);
        expect(totals.mappings.pieces).toBeLessThanOrEqual(baseline.mappings.pieces);
        expect(totals.tiles.tiles).toBeLessThanOrEqual(baseline.tiles.tiles);
    });
});

const BASELINE = {
    apart: { mappings: { pieces: 50 }, tiles: { tiles: 322 } },
    overlap: { mappings: { pieces: 50 }, tiles: { tiles: 319 } },
};

test('electron version is pinned to 22.3.27', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.dependencies.electron).toBe('22.3.27');
});
