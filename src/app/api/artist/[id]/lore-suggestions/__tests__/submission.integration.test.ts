/** @jest-environment node */
import { drizzle } from 'drizzle-orm/pglite';
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api';
import { eq, type SQL } from 'drizzle-orm';
import * as schema from '@/server/db/schema';

jest.mock('@/server/db/drizzle', () => ({ get db() { return mockDatabase; } }));
jest.mock('@/server/auth', () => ({ getServerAuthSession: jest.fn() }));

if (!Response.json) {
  Response.json = (data, init) => new Response(JSON.stringify(data), {
    ...init, headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
}

const { PGlite } = process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
const client = new PGlite();
const database = drizzle(client, { schema });
function adapt(executor: Pick<typeof database, 'query' | 'insert' | 'update' | 'select' | 'execute'>) {
  return {
    query: executor.query, insert: executor.insert.bind(executor), update: executor.update.bind(executor),
    select: executor.select.bind(executor), execute: async (query: SQL) => (await executor.execute(query)).rows,
  };
}
const mockDatabase = {
  ...adapt(database),
  transaction: (callback: (tx: ReturnType<typeof adapt>) => Promise<unknown>) => database.transaction(tx => callback(adapt(tx))),
};
const artistId = '00000000-0000-4000-8000-000000001423';
const userId = '00000000-0000-4000-8000-000000001424';
const ownerId = '00000000-0000-4000-8000-000000001425';
const claimId = '00000000-0000-4000-8000-000000001426';
let POST: typeof import('../route').POST;
let getServerAuthSession: typeof import('@/server/auth').getServerAuthSession;
let getVaultSourcesByArtistId: typeof import('@/server/utils/queries/dashboardQueries').getVaultSourcesByArtistId;
let canEditArtist: typeof import('@/server/utils/artistEditAuth').canEditArtist;

beforeAll(async () => {
  jest.resetModules();
  ({ POST } = await import('../route'));
  ({ getServerAuthSession } = await import('@/server/auth'));
  ({ getVaultSourcesByArtistId } = await import('@/server/utils/queries/dashboardQueries'));
  ({ canEditArtist } = await import('@/server/utils/artistEditAuth'));
  await client.exec("CREATE ROLE mnweb; CREATE FUNCTION uuid_generate_v4() RETURNS uuid LANGUAGE SQL AS 'SELECT gen_random_uuid()';");
  const tables = { users: schema.users, artists: schema.artists, artistClaims: schema.artistClaims,
    claimStatus: schema.claimStatus, sourceStatus: schema.sourceStatus, artistVaultSources: schema.artistVaultSources,
    artistActivityEvents: schema.artistActivityEvents, artistResearchJobs: schema.artistResearchJobs,
    ugcresearch: schema.ugcresearch, artistIdMappings: schema.artistIdMappings, confidenceLevel: schema.confidenceLevel };
  for (const statement of await generateMigration(generateDrizzleJson({}), generateDrizzleJson(tables))) {
    if (/^CREATE (TABLE|TYPE|UNIQUE INDEX)/.test(statement) || statement.includes('ADD CONSTRAINT')) await client.exec(statement);
  }
  // Match the existing application role's operations, without granting browser
  // access or changing any live database. All production queries below are real.
  await client.exec(`
    GRANT SELECT ON users, artists, artist_claims TO mnweb;
    GRANT UPDATE ON artists TO mnweb;
    GRANT SELECT, INSERT, UPDATE ON artist_vault_sources, artist_research_jobs TO mnweb;
    GRANT SELECT, INSERT ON artist_activity_events TO mnweb;
    GRANT UPDATE ON users TO mnweb;
    GRANT SELECT, UPDATE ON ugcresearch TO mnweb;
    GRANT SELECT ON artist_id_mappings TO mnweb;
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
    ALTER TABLE artist_claims ENABLE ROW LEVEL SECURITY;
    ALTER TABLE artist_vault_sources ENABLE ROW LEVEL SECURITY;
    ALTER TABLE artist_activity_events ENABLE ROW LEVEL SECURITY;
    ALTER TABLE artist_research_jobs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE ugcresearch ENABLE ROW LEVEL SECURITY;
    ALTER TABLE artist_id_mappings ENABLE ROW LEVEL SECURITY;
    CREATE UNIQUE INDEX jobs_live ON artist_research_jobs (artist_id, kind) WHERE status IN ('pending', 'running');
    CREATE UNIQUE INDEX sources_unique ON artist_vault_sources (artist_id, url);
  `);
  // The early Drizzle snapshot omits USING/WITH CHECK expressions. These are
  // the effective mnweb expressions verified in production, not schema changes.
  for (const table of ['users', 'artists', 'artist_claims', 'artist_vault_sources', 'artist_activity_events', 'artist_research_jobs', 'ugcresearch', 'artist_id_mappings']) {
    await client.exec(`CREATE POLICY fixture_app_access ON ${table} TO mnweb USING (true) WITH CHECK (true)`);
  }
}, 30000);
beforeEach(async () => {
  await client.exec('RESET ROLE; TRUNCATE artists, users CASCADE');
  await database.insert(schema.users).values([{ id: userId, username: 'Vinyl Goblin', isWhiteListed: true }, { id: ownerId }]);
  await database.insert(schema.artists).values({ id: artistId, name: 'Lore Fixture', createdAt: '2020-01-01T00:00:00Z' });
  jest.mocked(getServerAuthSession).mockResolvedValue({ user: { id: userId }, expires: '2099-01-01' });
});
afterAll(async () => { await client.close(); });

const call = (url = 'https://example.com/interview') => POST(new Request('https://test/lore-suggestions', {
  method: 'POST', body: JSON.stringify({ url, status: 'approved', isWhiteListed: true }),
}), { params: Promise.resolve({ id: artistId }) });

it.each([false, true])('persists approved Lore, attribution and coalesced work as mnweb (claimed: %s)', async claimed => {
  if (claimed) await database.insert(schema.artistClaims).values({ id: claimId, artistId, userId: ownerId, status: 'approved' });
  await client.exec('SET ROLE mnweb');
  const response = await call();
  expect(response.status).toBe(201);
  expect(await response.json()).toMatchObject({ status: 'approved' });
  const sources = await getVaultSourcesByArtistId(artistId, 'approved');
  expect(sources).toHaveLength(1);
  expect(sources[0]).toMatchObject({ origin: 'submission', url: 'https://example.com/interview' });
  const events = await database.query.artistActivityEvents.findMany();
  expect(events).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: sources[0]!.activityId, sourceId: sources[0]!.id, actorUserId: userId, action: 'source_submission', trigger: 'trusted_submission' }),
    expect.objectContaining({ actorUserId: userId, action: 'lore_refresh' }),
  ]));
  expect(await canEditArtist(userId, artistId)).toBe(false);
  expect((await call('https://example.com/second')).status).toBe(201);
  const jobs = await database.query.artistResearchJobs.findMany();
  expect(jobs).toHaveLength(1);
  expect(jobs[0]).toMatchObject({ kind: 'lore_refresh', state: { claimId: claimed ? claimId : null } });
});

it('uses a newly revoked role even while the session and request still assert whitelist access', async () => {
  await database.update(schema.users).set({ isWhiteListed: false }).where(eq(schema.users.id, userId));
  jest.mocked(getServerAuthSession).mockResolvedValue({ user: { id: userId, isWhiteListed: true, isAdmin: true }, expires: '2099-01-01' });
  await client.exec('SET ROLE mnweb');
  expect(await (await call()).json()).toMatchObject({ status: 'pending' });
  expect(await getVaultSourcesByArtistId(artistId, 'approved')).toHaveLength(0);
  expect(await getVaultSourcesByArtistId(artistId, 'pending')).toHaveLength(1);
  expect(await database.query.artistResearchJobs.findMany()).toHaveLength(0);
});

it.each(['pending', 'rejected', 'approved'] as const)('does not replace an existing %s source or its attribution', async status => {
  const [original] = await database.insert(schema.artistVaultSources).values({ artistId, url: 'https://example.com/interview#old', status }).returning();
  await client.exec('SET ROLE mnweb');
  expect((await call()).status).toBe(409);
  expect(await database.query.artistVaultSources.findMany()).toEqual([original]);
  expect(await database.query.artistActivityEvents.findMany()).toHaveLength(0);
  expect(await database.query.artistResearchJobs.findMany()).toHaveLength(0);
});

it('rolls back the approval when contributor auditing fails', async () => {
  await client.exec("ALTER TABLE artist_activity_events ADD CONSTRAINT fixture_reject CHECK (trigger <> 'trusted_submission'); SET ROLE mnweb");
  try {
    expect((await call()).status).toBe(500);
    expect(await getVaultSourcesByArtistId(artistId, 'approved')).toHaveLength(0);
    expect(await database.query.artistResearchJobs.findMany()).toHaveLength(0);
  } finally { await client.exec('RESET ROLE; ALTER TABLE artist_activity_events DROP CONSTRAINT fixture_reject'); }
});

async function pendingSource(actor = userId, origin = 'submission', status: 'pending' | 'rejected' = 'pending') {
  const [event] = await database.insert(schema.artistActivityEvents).values({ artistId, actorUserId: actor, actorKind: 'user', action: 'source_submission', trigger: 'visitor_suggestion' }).returning();
  const [source] = await database.insert(schema.artistVaultSources).values({ artistId, url: `https://example.com/${event!.id}`, title: 'Submitted interview', activityId: event!.id, origin, status }).returning();
  return source!;
}

async function adminSession() {
  await database.update(schema.users).set({ isAdmin: true }).where(eq(schema.users.id, ownerId));
  jest.mocked(getServerAuthSession).mockResolvedValue({ user: { id: ownerId }, expires: '2099-01-01' });
}

it('previews all direct submissions beyond one history page without including other contributors or research', async () => {
  const { getContributorApprovalItems } = await import('@/app/actions/getContributorApprovalItems');
  for (let i = 0; i < 27; i++) await pendingSource();
  await pendingSource(ownerId);
  await pendingSource(userId, 'research');
  await pendingSource(userId, 'unknown');
  await pendingSource(userId, 'submission', 'rejected');
  await database.insert(schema.ugcresearch).values({ artistId, userId, siteName: 'instagram', siteUsername: 'artist', ugcUrl: 'https://instagram.com/artist', origin: 'submission' });
  await adminSession();
  await client.exec('SET ROLE mnweb');
  const result = await getContributorApprovalItems(userId);
  expect(result).toMatchObject({ success: true, hasMore: false });
  expect(result.items).toHaveLength(28);
  expect(result.items?.filter(item => item.type === 'link')).toHaveLength(1);
});

it('bulk approval preserves attribution, skips changed/foreign/research items, and updates actual links', async () => {
  const { approveContributorSubmissions } = await import('@/app/actions/approveContributorSubmissions');
  const source = await pendingSource();
  const foreign = await pendingSource(ownerId);
  const research = await pendingSource(userId, 'research');
  const rejected = await pendingSource(userId, 'submission', 'rejected');
  const [link] = await database.insert(schema.ugcresearch).values({ artistId, userId, siteName: 'instagram', siteUsername: 'approvedartist', ugcUrl: 'https://instagram.com/approvedartist', origin: 'submission' }).returning();
  await adminSession();
  await client.exec('SET ROLE mnweb');
  const result = await approveContributorSubmissions(userId, [
    ...[source, foreign, research, rejected].map(item => ({ id: item.id, type: 'lore' as const })),
    { id: link!.id, type: 'link' },
  ]);
  expect(result).toMatchObject({ success: true, approved: 2, skipped: 3, failed: 0 });
  expect(await database.query.artistVaultSources.findFirst({ where: eq(schema.artistVaultSources.id, source.id) })).toMatchObject({ status: 'approved', activityId: source.activityId });
  expect(await database.query.artists.findFirst()).toMatchObject({ instagram: 'approvedartist' });
  expect(await database.query.ugcresearch.findFirst()).toMatchObject({ accepted: true, userId });
  expect(await database.query.artistActivityEvents.findMany()).toEqual(expect.arrayContaining([
    expect.objectContaining({ actorUserId: ownerId, action: 'source_approved', sourceId: source.id, trigger: 'admin_bulk_review' }),
  ]));
  expect(await database.query.artistResearchJobs.findMany()).toHaveLength(1);
  expect(await approveContributorSubmissions(userId, [{ id: link!.id, type: 'link' }, { id: source.id, type: 'lore' }])).toMatchObject({ approved: 0, skipped: 2, failed: 0 });
});

it('rejects bulk preview and writes for whitelist-only accounts even with an admin session claim', async () => {
  const { getContributorApprovalItems } = await import('@/app/actions/getContributorApprovalItems');
  const { approveContributorSubmissions } = await import('@/app/actions/approveContributorSubmissions');
  const source = await pendingSource();
  jest.mocked(getServerAuthSession).mockResolvedValue({ user: { id: userId, isAdmin: true }, expires: '2099-01-01' });
  await client.exec('SET ROLE mnweb');
  expect(await getContributorApprovalItems(userId)).toMatchObject({ success: false });
  expect(await approveContributorSubmissions(userId, [{ id: source.id, type: 'lore' }])).toMatchObject({ success: false, approved: 0 });
  expect(await getVaultSourcesByArtistId(artistId, 'approved')).toHaveLength(0);
});

it('reports a conflicting platform link as failed without approving it or losing other approvals', async () => {
  const { approveContributorSubmissions } = await import('@/app/actions/approveContributorSubmissions');
  const otherArtist = '00000000-0000-4000-8000-000000001427';
  await database.insert(schema.artists).values({ id: otherArtist, spotify: 'taken', createdAt: '2020-01-01T00:00:00Z' });
  const [link] = await database.insert(schema.ugcresearch).values({ artistId, userId, siteName: 'spotify', siteUsername: 'taken', ugcUrl: 'https://open.spotify.com/artist/taken', origin: 'submission' }).returning();
  const source = await pendingSource();
  await adminSession();
  await client.exec('SET ROLE mnweb');
  expect(await approveContributorSubmissions(userId, [{ id: link!.id, type: 'link' }, { id: source.id, type: 'lore' }])).toMatchObject({ success: false, approved: 1, skipped: 0, failed: 1 });
  expect(await database.query.ugcresearch.findFirst()).toMatchObject({ accepted: false });
  expect(await database.query.artists.findFirst({ where: eq(schema.artists.id, artistId) })).toMatchObject({ spotify: null });
});

it('rolls back a bulk link write if review attribution fails', async () => {
  const { approveContributorSubmissions } = await import('@/app/actions/approveContributorSubmissions');
  const [link] = await database.insert(schema.ugcresearch).values({ artistId, userId, siteName: 'instagram', siteUsername: 'newhandle', origin: 'submission' }).returning();
  await adminSession();
  await client.exec("ALTER TABLE artist_activity_events ADD CONSTRAINT reject_bulk_review CHECK (trigger <> 'admin_bulk_review'); SET ROLE mnweb");
  try {
    expect(await approveContributorSubmissions(userId, [{ id: link!.id, type: 'link' }])).toMatchObject({ success: false, approved: 0, failed: 1 });
    expect(await database.query.ugcresearch.findFirst()).toMatchObject({ accepted: false });
    expect(await database.query.artists.findFirst()).toMatchObject({ instagram: null });
  } finally { await client.exec('RESET ROLE; ALTER TABLE artist_activity_events DROP CONSTRAINT reject_bulk_review'); }
});

it('skips a link reviewed after the preview and leaves its artist destination unchanged', async () => {
  const { approveContributorSubmissions } = await import('@/app/actions/approveContributorSubmissions');
  const [link] = await database.insert(schema.ugcresearch).values({ artistId, userId, siteName: 'instagram', siteUsername: 'stalehandle', origin: 'submission', accepted: false, dateProcessed: '2026-10-05T12:00:00Z' }).returning();
  await adminSession();
  await client.exec('SET ROLE mnweb');
  expect(await approveContributorSubmissions(userId, [{ id: link!.id, type: 'link' }])).toMatchObject({ approved: 0, skipped: 1, failed: 0 });
  expect(await database.query.artists.findFirst()).toMatchObject({ instagram: null });
});
