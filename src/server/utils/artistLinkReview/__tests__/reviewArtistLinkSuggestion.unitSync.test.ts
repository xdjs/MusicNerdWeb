import { db } from '@/server/db/drizzle';
import { queueUnitSync } from '@/server/utils/units/queueUnitSync';
import { reviewArtistLinkSuggestion } from '../reviewArtistLinkSuggestion';

jest.mock('@/server/db/drizzle', () => ({ db: { transaction: jest.fn() } }));
jest.mock('@/server/utils/units/queueUnitSync', () => ({ queueUnitSync: jest.fn() }));
jest.mock('@/server/utils/activity/recordArtistActivity', () => ({ recordArtistActivity: jest.fn().mockResolvedValue('event') }));
jest.mock('@/server/utils/source/queueApprovedSourceExtraction', () => ({ queueApprovedSourceExtraction: jest.fn() }));
jest.mock('../lockLinkReview', () => ({ lockLinkReview: jest.fn() }));
jest.mock('../getApprovedWebsiteInventory', () => ({ getApprovedWebsiteInventory: jest.fn().mockResolvedValue([]) }));
jest.mock('../approveSourceBackedUgc', () => ({ approveSourceBackedUgc: jest.fn() }));
jest.mock('@/lib/musicLinks/isDestinationSource', () => ({ isDestinationSource: jest.fn().mockReturnValue(true) }));
jest.mock('@/lib/musicLinks/parseMusicDestination', () => ({ parseMusicDestination: jest.fn().mockReturnValue(null) }));
jest.mock('@/server/utils/queries/approveUGC', () => ({ approveUGC: jest.fn() }));
jest.mock('@/server/utils/artistIdentityLocks', () => ({ acquireArtistPlatformWriteLocks: jest.fn() }));

const ARTIST = 'artist-1';
let committed = false;
function run(status: string) {
  const execute = jest.fn()
    .mockResolvedValueOnce([{ id: 'source', url: 'https://x.test', status, type: 'article' }])
    .mockResolvedValueOnce([{ id: ARTIST }])
    .mockResolvedValue([]);
  db.transaction = jest.fn(async fn => { const out = await fn({ execute } as never) as never; committed = true; return out; });
}
beforeEach(() => {
  jest.clearAllMocks();
  committed = false;
  (queueUnitSync as jest.Mock).mockImplementation(async () => { expect(committed).toBe(true); return true; });
});

it('queues a unit sync after an approval commits', async () => {
  run('pending');
  await reviewArtistLinkSuggestion(ARTIST, 'user', { kind: 'source', id: 'source', decision: 'approve' });
  expect(queueUnitSync).toHaveBeenCalledWith(ARTIST);
});
it('queues a unit sync after a rejection commits', async () => {
  run('pending');
  await reviewArtistLinkSuggestion(ARTIST, 'user', { kind: 'source', id: 'source', decision: 'reject' } as never);
  expect(queueUnitSync).toHaveBeenCalledWith(ARTIST);
});
it('does not queue for a restore, which changes no status', async () => {
  run('approved');
  await reviewArtistLinkSuggestion(ARTIST, 'user', { kind: 'source', id: 'source', decision: 'restore' });
  expect(queueUnitSync).not.toHaveBeenCalled();
});
it('resolves normally when the hook fails', async () => {
  run('pending');
  (queueUnitSync as jest.Mock).mockRejectedValueOnce(new Error('boom'));
  await expect(reviewArtistLinkSuggestion(ARTIST, 'user', { kind: 'source', id: 'source', decision: 'approve' })).resolves.toBeUndefined();
});
