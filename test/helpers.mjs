import { expect, _electron } from '@playwright/test';
import { resolve, join } from 'path';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';

const ROOT = resolve(import.meta.dirname, '..');
export const FIXTURES = resolve(import.meta.dirname, 'fixtures');
const ELECTRON = resolve(ROOT, 'node_modules', '.bin', 'electron');
const APP_DIR = resolve(ROOT, 'static');

export async function launchApp() {
    // throwaway profile so tests never touch the real app's localStorage
    const userDataDir = mkdtempSync(join(tmpdir(), 'flex2-userdata-'));
    const app = await _electron.launch({
        executablePath: ELECTRON,
        args: [APP_DIR, `--user-data-dir=${userDataDir}`],
    });
    const page = await app.firstWindow();
    await page.waitForSelector('.file-object', { timeout: 30_000 });
    await page.waitForFunction(() => localStorage.length === 0, null, { timeout: 10_000 });
    return { app, page, userDataDir };
}

export async function closeApp(app) {
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

export async function clearEnvironment(page) {
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

export async function setFileObject(page, {
    format,
    artPath,
    artCompression = 'Uncompressed',
    artOffset = 0,
    artPaletteLine = 0,
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
        file.art.paletteLine = opts.artPaletteLine;
        file.art.extra.replace(opts.artExtra.map(source => ({
            compression: 'Uncompressed',
            address: '',
            paletteLine: 0,
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
    }, { format, artPath, artCompression, artOffset, artPaletteLine, artExtra, mappingsPath, dplcsPath, palettePaths, config });
    // wait for MobX → React re-render so FileObject picks up new paths
    await page.waitForTimeout(100);
}

export async function clickButton(page, label, action) {
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

export const clickLoad = (page, label) => clickButton(page, label, 'load');
export async function waitForIO(page) {
    // flush: ensure requestIdleCallbacks from the triggering click have fired
    await page.evaluate(() => new Promise(r => requestIdleCallback(r)));
    // wait for all "..." indicators to clear (IO finished)
    const busy = page.locator('.file-object').getByText('...', { exact: true });
    await expect(busy).toHaveCount(0, { timeout: 15_000 });
}

export async function clickSave(page, label) {
    await clickButton(page, label, 'save');
    await waitForIO(page);
}

export async function waitForMappings(page) {
    await expect.poll(() => page.evaluate(() =>
        window.__test__.environment.mappings.length,
    ), { timeout: 15_000 }).toBeGreaterThan(0);
}

export async function waitForTiles(page) {
    await expect.poll(() => page.evaluate(() =>
        window.__test__.environment.tiles.length,
    ), { timeout: 15_000 }).toBeGreaterThan(0);
}

export async function waitForDplcs(page) {
    await expect.poll(() => page.evaluate(() =>
        window.__test__.environment.dplcs.length,
    ), { timeout: 15_000 }).toBeGreaterThan(0);
}
