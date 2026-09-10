/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api';
import * as schema from '../schema';

it('the latest migration snapshot represents the complete declared schema', async () => {
    const journal = JSON.parse(readFileSync(resolve('drizzle/meta/_journal.json'), 'utf8'));
    const index = String(journal.entries.at(-1).idx).padStart(4, '0');
    const snapshot = JSON.parse(readFileSync(resolve(`drizzle/meta/${index}_snapshot.json`), 'utf8'));
    const current = generateDrizzleJson(schema, snapshot.id);
    // Missing earlier hand-written migrations would produce duplicate CREATE/ADD
    // statements here even though no schema change has been requested.
    expect(await generateMigration(snapshot, current)).toEqual([]);
});
