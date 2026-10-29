import { requestArtistLinkReview } from '@/lib/artistLinkReview/requestArtistLinkReview';
import { approveLinkSuggestion } from '../approveLinkSuggestion';

jest.mock('@/lib/artistLinkReview/requestArtistLinkReview', () => ({ requestArtistLinkReview: jest.fn() }));
const request = requestArtistLinkReview as jest.Mock;
const respond = (ok: boolean, body: unknown) => request.mockResolvedValue({ ok, json: async () => body });
beforeEach(() => jest.clearAllMocks());

it('approves the link suggestion on its artist', async () => {
  respond(true, { status: 'ok', success: true });
  await approveLinkSuggestion('a1', 'g1');
  expect(request).toHaveBeenCalledWith('a1', { id: 'g1', kind: 'ugc', decision: 'approve' });
});
it('throws the API error', async () => {
  respond(false, { status: 'error', error: 'A different account is already connected.' });
  await expect(approveLinkSuggestion('a1', 'g1')).rejects.toThrow('A different account is already connected.');
});
