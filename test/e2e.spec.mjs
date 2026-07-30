import { test, expect, _electron } from '@playwright/test';
import { resolve, join } from 'path';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';

const ROOT = resolve(import.meta.dirname, '..');
const FIXTURES = resolve(import.meta.dirname, 'fixtures');
const ELECTRON = resolve(ROOT, 'node_modules', '.bin', 'electron');
const APP_DIR = resolve(ROOT, 'static');

async function launchApp() {
    const app = await _electron.launch({
        executablePath: ELECTRON,
        args: [APP_DIR],
    });
    const page = await app.firstWindow();
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForSelector('.file-object', { timeout: 10_000 });
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
        file.mappings.path = opts.mappingsPath || '';
        file.dplcs.path = opts.dplcsPath || '';
        file.dplcs.enabled = !!opts.dplcsPath;
        file.palettes.replace(
            opts.palettePaths.map(p => ({
                path: typeof p === 'string' ? p : p.path,
                length: typeof p === 'string' ? 1 : (p.length || 1),
            })),
        );
        Object.assign(file.config, opts.config);
    }, { format, artPath, artCompression, artOffset, mappingsPath, dplcsPath, palettePaths, config });
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
test.afterAll(async () => { await closeApp(app); });

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
