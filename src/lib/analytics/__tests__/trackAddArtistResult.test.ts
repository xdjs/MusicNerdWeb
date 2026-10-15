import { trackAddArtistResult } from '@/lib/analytics/trackAddArtistResult';
import { trackEvent } from '@/lib/analytics/trackEvent';

jest.mock('@/lib/analytics/trackEvent', () => ({ trackEvent: jest.fn() }));

describe('trackAddArtistResult', () => {
    beforeEach(() => jest.clearAllMocks());

    it('sends the resolved step for the surface', () => {
        trackAddArtistResult('search', { status: 'success' });
        expect(trackEvent).toHaveBeenCalledWith('add_artist', { surface: 'search', step: 'added' });
    });

    it('sends nothing for a possible duplicate', () => {
        trackAddArtistResult('nav', { status: 'possible_duplicate' } as never);
        expect(trackEvent).not.toHaveBeenCalled();
    });
});
