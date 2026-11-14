import { db } from '@/server/db/drizzle';
import { queueUnitSync } from '@/server/utils/units/queueUnitSync';
import { updateVaultSourceStatus } from '../updateVaultSourceStatus';

jest.mock('@/server/db/drizzle', () => ({ db: { transaction: jest.fn() } }));
jest.mock('@/server/utils/units/queueUnitSync', () => ({ queueUnitSync: jest.fn() }));
jest.mock('@/server/utils/activity/recordArtistActivity', () => ({ recordArtistActivity: jest.fn().mockResolvedValue('event') }));
jest.mock('@/server/utils/source/queueApprovedSourceExtraction', () => ({ queueApprovedSourceExtraction: jest.fn() }));
jest.mock('../ownershipWrites', () => ({ lockScopedArtistWrite: jest.fn() }));

const ARTIST = 'artist-1';
const row = { id: 'source', artistId: ARTIST, status: 'approved' };
let committed = false;
let returning: jest.Mock;
beforeEach(() => {
  jest.clearAllMocks();
  committed = false;
  returning = jest.fn().mockResolvedValue([row]);
  const tx = {
    execute: jest.fn().mockResolvedValueOnce([{ artist_id: ARTIST }]).mockResolvedValueOnce([]),
    update: () => ({ set: () => ({ where: () => ({ returning }) }) }),
  };
  db.transaction = jest.fn(async fn => { const out = await fn(tx); committed = true; return out; }) as never;
  (queueUnitSync as jest.Mock).mockImplementation(async () => { expect(committed).toBe(true); return true; });
});

it('queues a unit sync for the artist after the transaction commits', async () => {
  expect(await updateVaultSourceStatus('source', 'approved')).toBe(row);
  expect(queueUnitSync).toHaveBeenCalledWith(ARTIST);
});
it('does not queue when nothing changed', async () => {
  returning.mockResolvedValueOnce([]);
  expect(await updateVaultSourceStatus('source', 'approved')).toBeUndefined();
  expect(queueUnitSync).not.toHaveBeenCalled();
});
it('returns the same result when the hook fails', async () => {
  (queueUnitSync as jest.Mock).mockRejectedValueOnce(new Error('boom'));
  expect(await updateVaultSourceStatus('source', 'approved')).toBe(row);
});
