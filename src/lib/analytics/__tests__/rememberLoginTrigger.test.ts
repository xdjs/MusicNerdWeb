import { rememberLoginTrigger } from '@/lib/analytics/rememberLoginTrigger';
import { LOGIN_TRIGGER_KEY } from '@/lib/analytics/events';

describe('rememberLoginTrigger', () => {
    beforeEach(() => sessionStorage.clear());

    it('stores which surface asked for login', () => {
        rememberLoginTrigger('claim');
        expect(sessionStorage.getItem(LOGIN_TRIGGER_KEY)).toBe('claim');
    });

    it('survives storage being unavailable', () => {
        const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
        expect(() => rememberLoginTrigger('nav')).not.toThrow();
        spy.mockRestore();
    });
});
