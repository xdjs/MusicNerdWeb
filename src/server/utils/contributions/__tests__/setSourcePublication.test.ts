import { db } from '@/server/db/drizzle';
import { recordArtistActivity } from '@/server/utils/activity/recordArtistActivity';
import { setSourcePublication } from '../setSourcePublication';

jest.mock('@/server/db/drizzle', () => ({ db: { transaction: jest.fn() } }));
jest.mock('@/server/utils/activity/recordArtistActivity', () => ({ recordArtistActivity: jest.fn() }));
const execute = jest.fn();
const input = { sourceId: 'source', publication: 'public' as const, expectedUpdatedAt: '2026-01-01T00:00:00Z' };
beforeEach(() => {
  jest.clearAllMocks();
  db.transaction = jest.fn(fn => fn({ execute } as never));
  execute.mockResolvedValueOnce([{ is_admin: true }]).mockResolvedValueOnce([{ artist_id: 'artist' }]).mockResolvedValueOnce([]).mockResolvedValueOnce([{ publication: 'inherit' }]).mockResolvedValueOnce([{ id: 'source' }]);
  (recordArtistActivity as jest.Mock).mockResolvedValue('event');
});
it('updates approved source and records truthful current publication decision in same transaction', async () => {
  expect(await setSourcePublication('admin', input)).toEqual({ artistId: 'artist', sourceId: 'source', publication: 'public' });
  expect(recordArtistActivity).toHaveBeenCalledWith('artist', 'source_publication_public', { userId: 'admin', sourceId: 'source', trigger: 'admin_publication:inherit->public' }, expect.objectContaining({ execute }));
});
it('rejects nonadmins before any source read or mutation', async () => {
  execute.mockReset().mockResolvedValueOnce([{ is_admin: false }]);
  await expect(setSourcePublication('user', input)).rejects.toThrow('Admin access required');
  expect(execute).toHaveBeenCalledTimes(1);
  expect(recordArtistActivity).not.toHaveBeenCalled();
});
it('refuses absent, unapproved or stale source rather than granting publication', async () => {
  execute.mockReset().mockResolvedValueOnce([{ is_admin: true }]).mockResolvedValueOnce([{ artist_id: 'artist' }]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
  await expect(setSourcePublication('admin', input)).rejects.toThrow('Source changed or is not approved');
  expect(recordArtistActivity).not.toHaveBeenCalled();
});
it('audit failure propagates to roll back transaction', async () => {
  (recordArtistActivity as jest.Mock).mockRejectedValueOnce(new Error('audit unavailable'));
  await expect(setSourcePublication('admin', input)).rejects.toThrow('audit unavailable');
});
it('does not mutate or audit an already identical decision', async () => {
  execute.mockReset().mockResolvedValueOnce([{ is_admin: true }]).mockResolvedValueOnce([{ artist_id: 'artist' }]).mockResolvedValueOnce([]).mockResolvedValueOnce([{ publication: 'public' }]);
  await setSourcePublication('admin', input);
  expect(execute).toHaveBeenCalledTimes(4);
  expect(recordArtistActivity).not.toHaveBeenCalled();
});
