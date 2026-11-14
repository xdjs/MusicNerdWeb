import { db } from '@/server/db/drizzle';
import { queueUnitSync } from '@/server/utils/units/queueUnitSync';
import { approvePendingLoreSource } from '../approvePendingLoreSource';

jest.mock('@/server/db/drizzle', () => ({ db: { transaction: jest.fn() } }));
jest.mock('@/server/utils/units/queueUnitSync', () => ({ queueUnitSync: jest.fn() }));
jest.mock('@/server/utils/activity/recordArtistActivity', () => ({ recordArtistActivity: jest.fn().mockResolvedValue('event') }));
jest.mock('@/server/utils/source/queueApprovedSourceExtraction', () => ({ queueApprovedSourceExtraction: jest.fn() }));

let committed = false;
let execute: jest.Mock;
beforeEach(() => {
  jest.clearAllMocks();
  committed = false;
  execute = jest.fn()
    .mockResolvedValueOnce([{ is_admin: true }])
    .mockResolvedValueOnce([{ artist_id: 'artist-1' }])
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ url: 'https://x.test', status: 'approved', file_path: null, extracted_text: null }]);
  const tx = { execute, query: { artistClaims: { findFirst: jest.fn().mockResolvedValue({ id: 'claim' }) } } };
  db.transaction = jest.fn(async fn => { const out = await fn(tx); committed = true; return out; }) as never;
  (queueUnitSync as jest.Mock).mockImplementation(async () => { expect(committed).toBe(true); return true; });
});

it('queues a unit sync for the artist after the approval commits', async () => {
  expect(await approvePendingLoreSource('admin', 'source')).toEqual({ artistId: 'artist-1', lore: true, claimId: 'claim' });
  expect(queueUnitSync).toHaveBeenCalledWith('artist-1');
});
it('does not queue when the source was not pending', async () => {
  execute.mockReset().mockResolvedValueOnce([{ is_admin: true }]).mockResolvedValueOnce([{ artist_id: 'artist-1' }]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
  expect(await approvePendingLoreSource('admin', 'source')).toBeNull();
  expect(queueUnitSync).not.toHaveBeenCalled();
});
it('returns the same result when the hook fails', async () => {
  (queueUnitSync as jest.Mock).mockRejectedValueOnce(new Error('boom'));
  expect(await approvePendingLoreSource('admin', 'source')).toEqual({ artistId: 'artist-1', lore: true, claimId: 'claim' });
});
