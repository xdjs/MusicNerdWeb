/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/pglite';
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api';
import * as schema from '@/server/db/schema';
import type { SQL } from 'drizzle-orm';
jest.mock('@/env', () => ({ APIFY_API_TOKEN: 'test', INSTAGRAM_REFRESH_ENABLED: true }));
const mockProviderStart = jest.fn<Promise<string>, unknown[]>(async () => 'run1');
jest.mock('../startLatestInstagramScrape', () => ({ startLatestInstagramScrape: (...args: unknown[]) => mockProviderStart(...args) }));
jest.mock('@/server/utils/socialIngest', () => ({ checkInstagramScrape: jest.fn(), collectInstagramScrape: jest.fn() }));
jest.mock('@/server/db/drizzle', () => ({ get db() { return mockDatabase; } }));
const { PGlite } = process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
const client = new PGlite();
const database = drizzle(client);
const mockDatabase = {
    execute: async (q: SQL) => (await database.execute(q)).rows,
    transaction: (work: (tx: { execute: (q: SQL) => Promise<unknown[]> }) => Promise<number>) =>
        database.transaction(tx => work({ execute: async q => (await tx.execute(q)).rows })),
};
let runScheduledInstagram: typeof import('../runScheduledInstagram').runScheduledInstagram;
let queueScheduledInstagram: typeof import('../queueScheduledInstagram').queueScheduledInstagram;
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

beforeAll(async () => {
    jest.resetModules();
    ({ queueScheduledInstagram } = await import('../queueScheduledInstagram'));
    ({ runScheduledInstagram } = await import('../runScheduledInstagram'));
    await client.exec(`create role mnweb; create role anon; create role authenticated;
        create function uuid_generate_v4() returns uuid language sql as 'select gen_random_uuid()';`);
    const ddl = await generateMigration(generateDrizzleJson({}), generateDrizzleJson({
        claimStatus: schema.claimStatus, artists: schema.artists, artistClaims: schema.artistClaims,
        artistSocialPosts: schema.artistSocialPosts, artistResearchJobs: schema.artistResearchJobs,
    }));
    for (const statement of ddl) if ((statement.startsWith('CREATE TABLE') || statement.startsWith('CREATE TYPE'))) await client.exec(statement);
    await client.exec(`create unique index live_jobs on artist_research_jobs (artist_id, kind) where status in ('pending','running');`);
    await client.exec(readFileSync('drizzle/0031_scheduled_instagram_reservations.sql', 'utf8'));
}, 30000);
afterAll(async () => { await client.close(); });
beforeEach(async () => { await client.exec('truncate artists, artist_claims, artist_social_posts, artist_research_jobs, instagram_refresh_reservations'); });

async function artist(n: number, options: { claimed?: boolean; posts?: boolean; handle?: string } = {}) {
    const handle = options.handle ?? `artist${n}`;
    await client.query('insert into artists (id, name, instagram) values ($1,$2,$3)', [id(n), `Artist ${n}`, handle]);
    if (options.claimed !== false) await client.query("insert into artist_claims (id,user_id,artist_id,status) values ($1,$2,$3,'approved')", [id(n + 100), id(999), id(n)]);
    if (options.posts !== false) await client.query(`insert into artist_social_posts
        (artist_id,platform,platform_post_id,owner_username,is_own_post,url,posted_at)
        values ($1,'instagram','post1',$2,true,'https://instagram.com/p/post1',now()-interval '2 days')`, [id(n), handle]);
}

it('queues only claimed artists with current-handle own posts and a bounded date window', async () => {
    await artist(1); await artist(2, { claimed: false }); await artist(3, { posts: false });
    await artist(4, { handle: 'https://instagram.com/wrong' });
    await artist(5); await client.exec(`update artist_social_posts set owner_username='old_handle' where artist_id='${id(5)}'`);
    expect(await queueScheduledInstagram()).toBe(1);
    const rows = (await client.query<{ state: { scheduledInstagram: boolean; since: string }; artist_id: string }>('select * from artist_research_jobs')).rows;
    expect(rows[0]?.artist_id).toBe(id(1));
    expect(rows[0]?.state.scheduledInstagram).toBe(true);
    expect(Date.now() - Date.parse(rows[0]!.state.since)).toBeGreaterThan(2.9 * 86400000);
    expect(Date.now() - Date.parse(rows[0]!.state.since)).toBeLessThan(3.1 * 86400000);
    expect(await queueScheduledInstagram()).toBe(0);
});
it('caps overlapping scheduling at ten and preserves budget after job deletion', async () => {
    for (let n = 1; n <= 14; n++) await artist(n);
    const queued = await Promise.all([queueScheduledInstagram(), queueScheduledInstagram()]);
    expect(queued.reduce((a,b) => a+b)).toBe(10);
    await client.exec('delete from artist_research_jobs');
    expect(await queueScheduledInstagram()).toBe(0);
    expect((await client.query('select * from instagram_refresh_reservations')).rows).toHaveLength(10);
});
it('retains failed-run costs and stops at the rolling budget', async () => {
    await artist(1);
    await client.query(`insert into instagram_refresh_reservations (job_id, artist_id, reserved_cents, reserved_at)
        values ($1,$2,999,now()-interval '2 days')`, [id(900), id(900)]);
    expect(await queueScheduledInstagram()).toBe(0);
});
it('rotates to least recently checked artists and excludes active manual research', async () => {
    await artist(1); await artist(2); await artist(3);
    await client.query(`insert into artist_research_jobs (artist_id, kind) values ($1,'caption_extract')`, [id(3)]);
    await client.query(`insert into instagram_refresh_reservations (job_id, artist_id, reserved_cents, reserved_at)
        values ($1,$2,3,now())`, [id(800), id(1)]);
    expect(await queueScheduledInstagram()).toBe(1);
    expect((await client.query<{ artist_id: string }>("select artist_id from artist_research_jobs where kind='social_ingest'")).rows[0]?.artist_id).toBe(id(2));
});
it('applies real app-role permissions: budget rows cannot be deleted or reduced', async () => {
    await client.exec('set role mnweb');
    try {
        await client.query('insert into instagram_refresh_reservations (job_id,artist_id,reserved_cents) values ($1,$2,3)', [id(700),id(1)]);
        await client.exec('update instagram_refresh_reservations set started_at=now()');
        expect((await client.query('select * from instagram_refresh_reservations')).rows).toHaveLength(1);
        await expect(client.exec('delete from instagram_refresh_reservations')).rejects.toThrow(/permission denied/);
        await expect(client.exec('update instagram_refresh_reservations set reserved_cents=1')).rejects.toThrow(/permission denied/);
    } finally { await client.exec('reset role'); }
    for (const role of ['anon','authenticated']) {
        await client.exec(`set role ${role}`);
        try { await expect(client.query('select * from instagram_refresh_reservations')).rejects.toThrow(/permission denied/); }
        finally { await client.exec('reset role'); }
    }
});

async function queuedJob() {
    const rows = (await client.query<{ id: string; artist_id: string; state: Record<string, unknown> }>('select * from artist_research_jobs')).rows;
    const row = rows[0]!;
    return { id: row.id, artistId: row.artist_id, state: row.state, kind: 'social_ingest' as const,
        status: 'running' as const, cursor: 0, total: null, attempts: 0, updatedAt: null };
}
it('runs actual scheduling and start SQL together, then persists the one paid run', async () => {
    await artist(1); await queueScheduledInstagram(); mockProviderStart.mockClear();
    const job = await queuedJob();
    expect(await runScheduledInstagram(job, Date.now()+55000)).toMatchObject({ waiting: true });
    const row = (await client.query('select started_at, run_id from instagram_refresh_reservations')).rows[0];
    expect(row).toMatchObject({ run_id: 'run1' });
    expect(String((row as { started_at: unknown }).started_at)).not.toBe('null');
    expect(mockProviderStart).toHaveBeenCalledTimes(1);
});
it.each(['claim', 'handle', 'expired'])('rejects queued work after %s changes using real eligibility SQL', async reason => {
    await artist(1); await queueScheduledInstagram(); const job = await queuedJob(); mockProviderStart.mockClear();
    if (reason === 'claim') await client.exec("update artist_claims set status='rejected'");
    if (reason === 'handle') await client.exec("update artists set instagram='new_handle'");
    if (reason === 'expired') await client.exec("update instagram_refresh_reservations set reserved_at=now()-interval '2 days'");
    expect(await runScheduledInstagram(job, Date.now()+55000)).toMatchObject({ done: true });
    expect(mockProviderStart).not.toHaveBeenCalled();
});
it('keeps an ambiguous start terminal across actual SQL retries', async () => {
    await artist(1); await queueScheduledInstagram(); const job = await queuedJob(); mockProviderStart.mockClear();
    await client.exec('update instagram_refresh_reservations set started_at=now()');
    await runScheduledInstagram(job, Date.now()+55000);
    await runScheduledInstagram(job, Date.now()+55000);
    expect(mockProviderStart).not.toHaveBeenCalled();
    expect((await client.query('select status from artist_research_jobs')).rows[0]).toMatchObject({ status: 'failed' });
});

it('checks again on the next UTC day even when cron arrives slightly earlier', async () => {
    await artist(1);
    await client.query(`insert into instagram_refresh_reservations (job_id, artist_id, reserved_cents, reserved_at)
        values ($1,$2,3,(date_trunc('day',now() at time zone 'UTC') at time zone 'UTC')-interval '1 second')`, [id(910),id(1)]);
    expect(await queueScheduledInstagram()).toBe(1);
});
