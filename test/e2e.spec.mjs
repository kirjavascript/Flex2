import { test, expect, _electron } from '@playwright/test';
import { resolve, join } from 'path';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';

const ROOT = resolve(import.meta.dirname, '..');
const FIXTURES = resolve(import.meta.dirname, 'fixtures');
const ELECTRON = resolve(ROOT, 'node_modules', '.bin', 'electron');
const APP_DIR = resolve(ROOT, 'static');

let userDataDir;

async function launchApp() {
    // throwaway profile so tests never touch the real app's localStorage
    userDataDir = mkdtempSync(join(tmpdir(), 'flex2-userdata-'));
    const app = await _electron.launch({
        executablePath: ELECTRON,
        args: [APP_DIR, `--user-data-dir=${userDataDir}`],
    });
    const page = await app.firstWindow();
    await page.waitForSelector('.file-object', { timeout: 30_000 });
    await page.waitForFunction(() => localStorage.length === 0, null, { timeout: 10_000 });
    return { app, page };
}

async function closeApp(app) {
    if (!app) return;
    let pid;
    try { pid = app.process()?.pid; } catch {}
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('close timeout')), 5_000),
    );
    try {
        await Promise.race([app.close(), timeout]);
    } catch {
        if (pid) try { process.kill(pid, 'SIGKILL'); } catch {}
    }
}

async function clearEnvironment(page) {
    await page.evaluate(() => {
        const { environment } = window.__test__;
        environment.clearArt();
        environment.mappings.replace([]);
        environment.dplcs.replace([]);
        environment.spriteMetadata.replace([]);
        environment.resetPalettes();
        environment.config.dplcsEnabled = false;
    });
}

async function setFileObject(page, {
    format,
    artPath,
    artCompression = 'Uncompressed',
    artOffset = 0,
    artExtra = [],
    mappingsPath,
    dplcsPath,
    palettePaths = [],
    config = {},
}) {
    await page.evaluate((opts) => {
        const { workspace } = window.__test__;
        const file = workspace.file;
        file.format = opts.format;
        file.art.path = opts.artPath || '';
        file.art.compression = opts.artCompression;
        file.art.offset = opts.artOffset;
        file.art.extra.replace(opts.artExtra.map(source => ({
            compression: 'Uncompressed',
            address: '',
            ...source,
        })));
        file.mappings.path = opts.mappingsPath || '';
        file.dplcs.path = opts.dplcsPath || '';
        file.dplcs.enabled = !!opts.dplcsPath;
        file.palettes.replace(
            opts.palettePaths.map(p => ({
                path: typeof p === 'string' ? p : p.path,
                length: typeof p === 'string' ? 1 : (p.length || 1),
            })),
        );
        // start from the script's own defaults, not the last test's config
        for (const key of Object.keys(file.config)) delete file.config[key];
        Object.assign(file.config, opts.config);
    }, { format, artPath, artCompression, artOffset, artExtra, mappingsPath, dplcsPath, palettePaths, config });
    // wait for MobX → React re-render so FileObject picks up new paths
    await page.waitForTimeout(100);
}

async function clickButton(page, label, action) {
    const items = page.locator('.file-object .menu-item');
    const count = await items.count();
    for (let i = 0; i < count; i++) {
        const item = items.nth(i);
        const text = await item.locator('.item').first().textContent();
        if (text?.trim() === label) {
            await item.locator('button', { hasText: action }).click();
            return;
        }
    }
    throw new Error(`No menu-item found with label "${label}" action "${action}"`);
}

const clickLoad = (page, label) => clickButton(page, label, 'load');
async function waitForIO(page) {
    // flush: ensure requestIdleCallbacks from the triggering click have fired
    await page.evaluate(() => new Promise(r => requestIdleCallback(r)));
    // wait for all "..." indicators to clear (IO finished)
    const busy = page.locator('.file-object').getByText('...', { exact: true });
    await expect(busy).toHaveCount(0, { timeout: 15_000 });
}

async function clickSave(page, label) {
    await clickButton(page, label, 'save');
    await waitForIO(page);
}

async function waitForMappings(page) {
    await expect.poll(() => page.evaluate(() =>
        window.__test__.environment.mappings.length,
    ), { timeout: 15_000 }).toBeGreaterThan(0);
}

async function waitForTiles(page) {
    await expect.poll(() => page.evaluate(() =>
        window.__test__.environment.tiles.length,
    ), { timeout: 15_000 }).toBeGreaterThan(0);
}

async function waitForDplcs(page) {
    await expect.poll(() => page.evaluate(() =>
        window.__test__.environment.dplcs.length,
    ), { timeout: 15_000 }).toBeGreaterThan(0);
}

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
    const errors = await page.locator('.error').allTextContents();
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

let app, page;
test.beforeAll(async () => { ({ app, page } = await launchApp()); });
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
        const field = page.locator('.mapping-settings .render-line');
        const scrollTop = () => field.evaluate((el) => el.closest('.flexlayout__tab').scrollTop);
        // scrolling down, since the tab starts at the top
        await page.evaluate(() => { window.__test__.environment.config.artPaletteLine = 3; });
        await field.hover();
        await page.mouse.wheel(0, 100);
        await expect(field).toHaveValue('2');
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

    test('a digit cannot be recorded, it would take the count', async () => {
        await tab('Settings').click();
        await keyButton('Vertical Flip').click();
        await page.keyboard.press('5');
        await expect(page.locator('.keys .setting-row', { hasText: 'Vertical Flip' }))
            .toContainText('digits are for counts');
        await page.locator('.keys-header span').click();
        await expect(keyButton('Vertical Flip')).toHaveText('v');
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
});

test('electron version is pinned to 22.3.27', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.dependencies.electron).toBe('22.3.27');
});
