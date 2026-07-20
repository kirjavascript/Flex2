import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './test',
    timeout: 60_000,
    retries: 1,
    workers: 1,
    snapshotDir: './test/snapshots',
    snapshotPathTemplate: '{snapshotDir}/{arg}{ext}',
});
