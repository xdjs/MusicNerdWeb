import { takeCompletedLogin } from '@/lib/analytics/takeCompletedLogin';
import { LOGIN_COMPLETED_KEY, LOGIN_TRIGGER_KEY } from '@/lib/analytics/events';

describe('takeCompletedLogin', () => {
    beforeEach(() => sessionStorage.clear());

    it('returns the login event once, with the trigger that asked', () => {
        sessionStorage.setItem(LOGIN_TRIGGER_KEY, 'claim');
        sessionStorage.setItem(LOGIN_COMPLETED_KEY, 'new');
        expect(takeCompletedLogin()).toEqual({ trigger: 'claim', new: true });
        expect(takeCompletedLogin()).toBeNull();
        expect(sessionStorage.getItem(LOGIN_TRIGGER_KEY)).toBeNull();
        expect(sessionStorage.getItem(LOGIN_COMPLETED_KEY)).toBeNull();
    });

    it('reports nav for a returning user who used the nav button', () => {
        sessionStorage.setItem(LOGIN_COMPLETED_KEY, 'returning');
        expect(takeCompletedLogin()).toEqual({ trigger: 'nav', new: false });
    });

    it('returns null when no login just completed, leaving a pending trigger alone', () => {
        sessionStorage.setItem(LOGIN_TRIGGER_KEY, 'add_link');
        expect(takeCompletedLogin()).toBeNull();
        expect(sessionStorage.getItem(LOGIN_TRIGGER_KEY)).toBe('add_link');
    });

    it('survives storage being unavailable', () => {
        const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
        expect(takeCompletedLogin()).toBeNull();
        spy.mockRestore();
    });
});
