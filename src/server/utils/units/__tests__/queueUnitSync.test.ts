import { db } from '@/server/db/drizzle';
import { queueUnitSync } from '../queueUnitSync';

jest.mock('@/server/db/drizzle', () => ({ db: { execute: jest.fn() } }));

const execute = db.execute as unknown as jest.Mock;
const ARTIST = '11111111-1111-4111-8111-111111111111';

/** Flatten a drizzle sql object into its literal text and bound parameters. */
function render(query: { queryChunks: unknown[] }) {
  let text = '';
  const params: unknown[] = [];
  for (const chunk of query.queryChunks as any[]) {
    if (chunk && Array.isArray(chunk.value)) text += chunk.value.join('');
    else params.push(chunk);
  }
  return { text: text.replace(/\s+/g, ' ').trim(), params };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

it('inserts a pending unit_sync job with the partial-index conflict target and rescan update', async () => {
  execute.mockResolvedValueOnce([{ inserted: true }]);
  expect(await queueUnitSync(ARTIST)).toBe(true);
  const { text, params } = render(execute.mock.calls[0][0]);
  expect(text).toContain("insert into artist_research_jobs (artist_id, kind, status, state)");
  expect(text).toContain("'unit_sync', 'pending', '{}'::jsonb");
  expect(text).toContain("on conflict (artist_id, kind) where status in ('pending','running')");
  expect(text).toContain(`do update set state = coalesce(artist_research_jobs.state, '{}'::jsonb) || '{"rescan":true}'::jsonb`);
  expect(params).toContain(ARTIST);
  expect(text).not.toContain(ARTIST);
});

it('returns false when a live job already existed and was flagged to rescan', async () => {
  execute.mockResolvedValueOnce([{ inserted: false }]);
  expect(await queueUnitSync(ARTIST)).toBe(false);
});

it('swallows a database error and warns with the artist id only', async () => {
  execute.mockRejectedValueOnce(new Error('violates check constraint "secret detail"'));
  await expect(queueUnitSync(ARTIST)).resolves.toBe(false);
  expect(console.warn).toHaveBeenCalledTimes(1);
  const args = (console.warn as jest.Mock).mock.calls[0];
  expect(JSON.stringify(args)).toContain(ARTIST);
  expect(JSON.stringify(args)).not.toContain('secret detail');
});
