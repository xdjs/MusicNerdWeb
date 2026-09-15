const mockTrack = jest.fn();
jest.mock('@vercel/analytics/server', () => ({ track: (...args: unknown[]) => mockTrack(...args) }));

import { trackServerEvent } from '@/server/utils/analytics/trackServerEvent';

describe('trackServerEvent', () => {
    beforeEach(() => mockTrack.mockReset());

    it('forwards the event name and properties to Vercel', async () => {
        mockTrack.mockResolvedValue(undefined);
        await trackServerEvent('ask_question', { outcome: 'answered', sources: 3 });
        expect(mockTrack).toHaveBeenCalledWith('ask_question', { outcome: 'answered', sources: 3 });
    });

    it('resolves even when Vercel rejects, so a request never fails on analytics', async () => {
        mockTrack.mockRejectedValue(new Error('No session context found'));
        await expect(trackServerEvent('profile_edit', { action: 'photo', target: null })).resolves.toBeUndefined();
    });

    it('resolves when track throws synchronously', async () => {
        mockTrack.mockImplementation(() => { throw new Error('bad property'); });
        await expect(trackServerEvent('profile_edit', { action: 'photo', target: null })).resolves.toBeUndefined();
    });
});
