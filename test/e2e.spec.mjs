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
        environment.tiles.replace([]);
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
            offset: 0,
            base: '',
            length: '',
            fromSprite: '',
            enabled: true,
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
                    } else {
                        // each table's entries are offsets from its own label
                        expect(listing).toContain('Map_SuperSonic_:');
                        expect(listing).toMatch(/dc\.w \S+-Map_Sonic_\n/);
                        expect(listing).toMatch(/dc\.w \S+-Map_SuperSonic_/);
                        expect(dplcListing).toMatch(/dc\.w \S+-PLC_SuperSonic_/);
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

    const PENGUINATOR = resolve(FIXTURES, 's3k/art/Penguinator.bin');
    // S3K's Sonic frames from $DA on index ArtUnc_Sonic_Extra instead of ArtUnc_Sonic
    const FROM_SPRITE = 0xDA;
    const SONIC_TABLE = 251;

    const artFile = (tiles, fill) =>
        Buffer.from(Array.from({ length: tiles * 0x20 }, (_, i) => (fill + i) & 0xFF));

    async function tileAt(page, index) {
        return page.evaluate((i) => window.__test__.toJS(window.__test__.environment.tiles[i]), index);
    }

    test('a second art file loads at its own tile base', async () => {
        const tmp = mkdtempSync(join(tmpdir(), 'flex2-test-'));
        try {
            const extraPath = join(tmp, 'extra.bin');
            writeFileSync(extraPath, artFile(2, 0x40));
            const firstCount = readFileSync(PENGUINATOR).length / 0x20;
            const base = firstCount + 2;

            await setFileObject(page, {
                format: 'Sonic 3&K.js',
                artPath: PENGUINATOR,
                artExtra: [{ path: extraPath, base }],
            });
            await clearEnvironment(page);
            await clickLoad(page, 'Art');
            await waitForTiles(page);
            expect(await getErrors(page)).toHaveLength(0);

            const tileCount = await page.evaluate(() => window.__test__.environment.tiles.length);
            expect(tileCount).toBe(base + 2);

            // the gap between the two files is blank, the extra art starts at its base
            expect(await tileAt(page, base - 1)).toEqual(new Array(64).fill(0));
            expect((await tileAt(page, base)).slice(0, 4)).toEqual([4, 0, 4, 1]);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    test('an unset tile base is pinned to the end of the previous file', async () => {
        const tmp = mkdtempSync(join(tmpdir(), 'flex2-test-'));
        try {
            const extraPath = join(tmp, 'extra.bin');
            writeFileSync(extraPath, artFile(3, 0x10));
            const firstCount = readFileSync(PENGUINATOR).length / 0x20;

            await setFileObject(page, {
                format: 'Sonic 3&K.js',
                artPath: PENGUINATOR,
                artExtra: [{ path: extraPath }],
            });
            await clearEnvironment(page);
            await clickLoad(page, 'Art');
            await waitForTiles(page);
            expect(await getErrors(page)).toHaveLength(0);

            const base = await page.evaluate(() => window.__test__.workspace.file.art.extra[0].base);
            expect(base).toBe(firstCount);
            expect(await page.evaluate(() => window.__test__.environment.tiles.length))
                .toBe(firstCount + 3);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    test('art save splits the tiles back over both files', async () => {
        const tmp = mkdtempSync(join(tmpdir(), 'flex2-test-'));
        try {
            const firstPath = join(tmp, 'first.bin');
            const extraPath = join(tmp, 'extra.bin');
            const first = readFileSync(PENGUINATOR);
            const extra = artFile(3, 0x10);
            writeFileSync(firstPath, first);
            writeFileSync(extraPath, extra);

            await setFileObject(page, {
                format: 'Sonic 3&K.js',
                artPath: firstPath,
                artExtra: [{ path: extraPath }],
            });
            await clearEnvironment(page);
            await clickLoad(page, 'Art');
            await waitForTiles(page);
            await clickSave(page, 'Art');
            expect(await getErrors(page)).toHaveLength(0);

            expect(readFileSync(firstPath).equals(first)).toBe(true);
            expect(readFileSync(extraPath).equals(extra)).toBe(true);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    test('a disabled source is neither loaded nor written', async () => {
        const tmp = mkdtempSync(join(tmpdir(), 'flex2-test-'));
        try {
            const firstPath = join(tmp, 'first.bin');
            const extraPath = join(tmp, 'extra.bin');
            const first = readFileSync(PENGUINATOR);
            const extra = artFile(3, 0x10);
            writeFileSync(firstPath, first);
            writeFileSync(extraPath, extra);
            const firstCount = first.length / 0x20;

            await setFileObject(page, {
                format: 'Sonic 3&K.js',
                artPath: firstPath,
                artExtra: [{ path: extraPath, base: firstCount, enabled: false }],
            });
            await clearEnvironment(page);
            await clickLoad(page, 'Art');
            await waitForTiles(page);

            expect(await page.evaluate(() => window.__test__.environment.tiles.length))
                .toBe(firstCount);

            // saving leaves the file the disabled source points at alone
            await clickSave(page, 'Art');
            expect(readFileSync(firstPath).equals(first)).toBe(true);
            expect(readFileSync(extraPath).equals(extra)).toBe(true);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    test('tile length clips a source on load and on save', async () => {
        const tmp = mkdtempSync(join(tmpdir(), 'flex2-test-'));
        try {
            const firstPath = join(tmp, 'first.bin');
            const extraPath = join(tmp, 'extra.bin');
            writeFileSync(firstPath, readFileSync(PENGUINATOR));
            writeFileSync(extraPath, artFile(4, 0x10));
            const firstCount = readFileSync(PENGUINATOR).length / 0x20;

            await setFileObject(page, {
                format: 'Sonic 3&K.js',
                artPath: firstPath,
                artExtra: [{ path: extraPath, base: firstCount, length: 1 }],
            });
            await clearEnvironment(page);
            await clickLoad(page, 'Art');
            await waitForTiles(page);

            // only the first tile of the extra file is taken
            expect(await page.evaluate(() => window.__test__.environment.tiles.length))
                .toBe(firstCount + 1);

            await clickSave(page, 'Art');
            expect(readFileSync(extraPath).length).toBe(0x20);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    test('saving a source that is overlaid by another one errors', async () => {
        const tmp = mkdtempSync(join(tmpdir(), 'flex2-test-'));
        try {
            const firstPath = join(tmp, 'first.bin');
            const extraPath = join(tmp, 'extra.bin');
            const first = readFileSync(PENGUINATOR);
            const extra = artFile(3, 0x10);
            writeFileSync(firstPath, first);
            writeFileSync(extraPath, extra);

            await setFileObject(page, {
                format: 'Sonic 3&K.js',
                artPath: firstPath,
                // lands in the middle of the first file, so it can't be saved back
                artExtra: [{ path: extraPath, base: 10 }],
            });
            await clearEnvironment(page);
            await clickLoad(page, 'Art');
            await waitForTiles(page);
            await clickSave(page, 'Art');

            await expect(
                page.locator('.file-object .item', { hasText: 'is overlaid by later art' }),
            ).toHaveCount(1);
            // neither file is touched
            expect(readFileSync(firstPath).equals(first)).toBe(true);
            expect(readFileSync(extraPath).equals(extra)).toBe(true);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    test('nonsense source numbers stop art and mapping IO', async () => {
        const tmp = mkdtempSync(join(tmpdir(), 'flex2-test-'));
        try {
            const firstPath = join(tmp, 'first.bin');
            const extraPath = join(tmp, 'extra.bin');
            const first = readFileSync(PENGUINATOR);
            const extra = artFile(3, 0x10);
            writeFileSync(firstPath, first);
            writeFileSync(extraPath, extra);

            const errorShown = (text) =>
                expect(page.locator('.file-object .item', { hasText: text })).toHaveCount(1);

            for (const [source, message] of [
                [{ base: -3 }, 'tile base must be a whole number 0 or more, got -3'],
                [{ base: 200, length: -3 }, 'tile length must be a whole number 1 or more, got -3'],
                [{ base: 200, fromSprite: -5 }, 'from sprite must be a whole number 0 or more, got -5'],
            ]) {
                await setFileObject(page, {
                    format: 'Sonic 3&K.js',
                    artPath: firstPath,
                    artExtra: [{ path: extraPath, ...source }],
                });
                await clearEnvironment(page);
                await clickLoad(page, 'Art');
                await waitForIO(page);
                await errorShown(message);

                // and nothing is written on the way out
                await clickSave(page, 'Art');
                await errorShown(message);
                expect(readFileSync(firstPath).equals(first)).toBe(true);
                expect(readFileSync(extraPath).equals(extra)).toBe(true);
            }

            // a bad fromSprite would rebase mappings, so it stops that too.
            // a value the art error above doesn't mention, since that one is
            // still on screen until art IO runs again
            await setFileObject(page, {
                format: 'Sonic 3&K.js',
                artPath: firstPath,
                artExtra: [{ path: extraPath, base: 200, fromSprite: -7 }],
                mappingsPath: resolve(FIXTURES, 's3k/maps/Penguinator.asm'),
                dplcsPath: resolve(FIXTURES, 's3k/dplc/Penguinator.asm'),
                config: { format: 'object', mapMacros: true },
            });
            await clearEnvironment(page);
            await clickLoad(page, 'Mappings');
            await waitForIO(page);
            await errorShown('from sprite must be a whole number 0 or more, got -7');
            expect(await page.evaluate(() => window.__test__.environment.mappings.length)).toBe(0);
        } finally {
            rmSync(tmp, { recursive: true, force: true });
        }
    });

    test('DPLC art past fromSprite is rebased, per table', async () => {
        const tmp = mkdtempSync(join(tmpdir(), 'flex2-test-'));
        try {
            // saving the object writes art too, so keep it off the fixtures
            const firstPath = join(tmp, 'first.bin');
            writeFileSync(firstPath, readFileSync(PENGUINATOR));
            const extraPath = join(tmp, 'extra.bin');
            writeFileSync(extraPath, artFile(1, 0));
            const base = 4103;
            const sonic = {
                format: 'Sonic 3&K.js',
                mappingsPath: resolve(FIXTURES, 's3k/maps/Sonic.asm'),
                dplcsPath: resolve(FIXTURES, 's3k/dplc/Sonic.asm'),
                config: { format: 'sonic', mapMacros: true },
            };

            await setFileObject(page, sonic);
            await clearEnvironment(page);
            await clickLoad(page, 'Object');
            await waitForMappings(page);
            await waitForDplcs(page);
            const plain = await snapshotEnv(page);
            expect(await getErrors(page)).toHaveLength(0);

            await setFileObject(page, {
                ...sonic,
                artPath: firstPath,
                artExtra: [{ path: extraPath, base, fromSprite: FROM_SPRITE }],
            });
            await clearEnvironment(page);
            await clickLoad(page, 'Object');
            await waitForMappings(page);
            await waitForDplcs(page);
            const rebased = await snapshotEnv(page);
            expect(await getErrors(page)).toHaveLength(0);

            const shift = (sprite, i) =>
                sprite.map((entry, j) => entry.art - plain.dplcs[i][j].art);
            const expected = (i) => {
                const relative = i < SONIC_TABLE ? i : i - SONIC_TABLE;
                return relative >= FROM_SPRITE ? base : 0;
            };

            expect(rebased.dplcs).toHaveLength(plain.dplcs.length);
            rebased.dplcs.forEach((sprite, i) => {
                const shifts = new Set(shift(sprite, i));
                expect([...shifts]).toEqual(sprite.length ? [expected(i)] : []);
            });
            // mappings index the sprite's own tiles, so they are left alone
            expect(rebased.mappings).toEqual(plain.mappings);

            // saved DPLCs go back out relative to their own art file
            await setFileObject(page, {
                ...sonic,
                mappingsPath: join(tmp, 'map.asm'),
                dplcsPath: join(tmp, 'dplc.asm'),
                artPath: firstPath,
                artExtra: [{ path: extraPath, base, fromSprite: FROM_SPRITE }],
            });
            await clickSave(page, 'Object');
            expect(await getErrors(page)).toHaveLength(0);

            await setFileObject(page, {
                ...sonic,
                mappingsPath: join(tmp, 'map.asm'),
                dplcsPath: join(tmp, 'dplc.asm'),
            });
            await clearEnvironment(page);
            await clickLoad(page, 'Object');
            await waitForMappings(page);
            await waitForDplcs(page);
            const reloaded = await snapshotEnv(page);
            expect(await getErrors(page)).toHaveLength(0);
            expect(reloaded.dplcs).toEqual(plain.dplcs);
            expect(reloaded.mappings).toEqual(plain.mappings);
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
