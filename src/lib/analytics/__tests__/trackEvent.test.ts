const mockTrack = jest.fn();
jest.mock('@vercel/analytics', () => ({ track: (...args: unknown[]) => mockTrack(...args) }));

import { trackEvent } from '@/lib/analytics/trackEvent';

describe('trackEvent', () => {
    beforeEach(() => mockTrack.mockReset());

    it('forwards the event name and properties to Vercel', () => {
        trackEvent('search', { outcome: 'none', query: 'abc' });
        expect(mockTrack).toHaveBeenCalledWith('search', { outcome: 'none', query: 'abc' });
    });

    it('never throws when the Vercel script rejects the call', () => {
        mockTrack.mockImplementation(() => { throw new Error('no script'); });
        expect(() => trackEvent('claim', { step: 'start' })).not.toThrow();
    });
});
