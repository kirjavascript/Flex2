import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './test/bench',
    testMatch: '*.bench.mjs',
    workers: 1,
    reporter: 'list',
});
