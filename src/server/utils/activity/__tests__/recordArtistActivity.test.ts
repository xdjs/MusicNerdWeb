jest.mock('@/server/db/drizzle', () => ({ db: { insert: jest.fn() } }));
import { db } from '@/server/db/drizzle';
import { recordArtistActivity } from '../recordArtistActivity';
import { withArtistOperation } from '../../artistOperationContext';
it('uses the initiating server context and records an immutable request', async () => {
  const returning = jest.fn().mockResolvedValue([{ id: 'event' }]);
  const values = jest.fn().mockReturnValue({ returning });
  (db.insert as jest.Mock).mockReturnValue({ values });
  const id = await withArtistOperation('a1', { userId: 'initiator', expectedClaimId: null, trigger: 'onboarding' }, () => recordArtistActivity('a1', 'source_search'));
  expect(id).toBe('event');
  expect(values).toHaveBeenCalledWith(expect.objectContaining({ artistId: 'a1', actorUserId: 'initiator', actorKind: 'user', trigger: 'onboarding', action: 'source_search' }));
});
it('does not invent a user when legacy work has no context', async () => {
  const values = jest.fn().mockReturnValue({ returning: async () => [{ id: 'event' }] });
  (db.insert as jest.Mock).mockReturnValue({ values });
  await recordArtistActivity('a1', 'source_search');
  expect(values).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: null, actorKind: 'unknown' }));
});
it('fails before unrecorded research when the audit insert fails', async () => {
  (db.insert as jest.Mock).mockImplementation(() => { throw new Error('audit unavailable'); });
  await expect(recordArtistActivity('a1', 'source_search')).rejects.toThrow('audit unavailable');
});
