import { reviewLoreSource } from '../reviewLoreSource';
import { requestArtistSources } from '../requestArtistSources';

jest.mock('../requestArtistSources', () => ({ requestArtistSources: jest.fn().mockResolvedValue({ success: true }) }));

it('PATCHes the decision, applied only while the source is pending', async () => {
  expect(await reviewLoreSource('a1', 's1', 'rejected')).toEqual({ success: true });
  expect(requestArtistSources).toHaveBeenCalledWith('a1', { method: 'PATCH', sourceId: 's1', body: { status: 'rejected', expectedStatus: 'pending' } });
});
