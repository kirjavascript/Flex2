import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './test',
    timeout: 60_000,
    retries: 1,
    workers: 1,
    outputDir: './test/test-results',
    snapshotDir: './test/snapshots',
    snapshotPathTemplate: '{snapshotDir}/{arg}{ext}',
    reporter: [['list'], ['./test/cleanup-reporter.mjs']],
});
