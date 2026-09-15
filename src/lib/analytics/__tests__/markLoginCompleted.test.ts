import { markLoginCompleted } from '@/lib/analytics/markLoginCompleted';
import { LOGIN_COMPLETED_KEY } from '@/lib/analytics/events';

describe('markLoginCompleted', () => {
    beforeEach(() => sessionStorage.clear());

    it('records whether the account is new before the page reloads', () => {
        markLoginCompleted(true);
        expect(sessionStorage.getItem(LOGIN_COMPLETED_KEY)).toBe('new');
        markLoginCompleted(false);
        expect(sessionStorage.getItem(LOGIN_COMPLETED_KEY)).toBe('returning');
    });

    it('survives storage being unavailable', () => {
        const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
        expect(() => markLoginCompleted(true)).not.toThrow();
        spy.mockRestore();
    });
});
