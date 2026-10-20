/** @jest-environment node */
import { execFileSync } from 'node:child_process';
import path from 'node:path';

test('real image rendering preserves supported accents offline and rejects uncovered glyphs before network access', () => {
    const output = execFileSync(process.execPath, [path.join(process.cwd(), 'scripts/artist-share/verifyOfflineRender.cjs')], {
        cwd: process.cwd(), encoding: 'utf8', timeout: 30_000,
    });
    expect(JSON.parse(output)).toEqual({ supported: 9, unsupported: 7, coverage: 226, fetchCalls: 0 });
});
