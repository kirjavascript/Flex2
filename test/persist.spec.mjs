import { test, expect } from '@playwright/test';
import { rmSync } from 'fs';
import { launchApp, closeApp } from './helpers.mjs';

test('import settings are kept across restarts', async () => {
    const settings = {
        fuzziness: 1, scale: 2, fixedCanvas: true, type: 'tiles',
        overlap: true, gridAligned: true, alignToArt: true,
    };
    let { app, page, userDataDir } = await launchApp();
    try {
        await page.evaluate((settings) => Object.assign(window.__test__.importState, settings), settings);
        await closeApp(app);
        ({ app, page } = await launchApp({ existing: userDataDir }));
        const kept = await page.evaluate((keys) => {
            const { importState } = window.__test__;
            return Object.fromEntries(keys.map((key) => [key, importState[key]]));
        }, Object.keys(settings));
        expect(kept).toEqual(settings);
    } finally {
        await closeApp(app);
        rmSync(userDataDir, { recursive: true, force: true });
    }
});
