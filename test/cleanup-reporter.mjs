import { readdirSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = resolve(import.meta.dirname, 'test-results');

// .last-run.json is written in onEnd, so cleanup has to wait for onExit
export default class CleanupReporter {
    onEnd({ status }) {
        this.passed = status === 'passed';
    }
    onExit() {
        if (!this.passed || !existsSync(dir)) return;
        if (readdirSync(dir).every((f) => f === '.last-run.json')) {
            rmSync(dir, { recursive: true });
        }
    }
}
