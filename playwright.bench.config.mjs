import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './test/bench',
    testMatch: '*.bench.mjs',
    workers: 1,
    outputDir: './test/test-results',
    reporter: [['list'], ['./test/cleanup-reporter.mjs']],
});
