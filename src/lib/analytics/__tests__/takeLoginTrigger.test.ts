import { takeLoginTrigger } from '@/lib/analytics/takeLoginTrigger';
import { LOGIN_TRIGGER_KEY } from '@/lib/analytics/events';

describe('takeLoginTrigger', () => {
    beforeEach(() => sessionStorage.clear());

    it('hands the stored trigger back once', () => {
        sessionStorage.setItem(LOGIN_TRIGGER_KEY, 'add_link');
        expect(takeLoginTrigger()).toBe('add_link');
        expect(sessionStorage.getItem(LOGIN_TRIGGER_KEY)).toBeNull();
        expect(takeLoginTrigger()).toBe('nav');
    });

    it('defaults to the nav button when nothing asked', () => {
        expect(takeLoginTrigger()).toBe('nav');
    });

    it('does not trust an unknown stored value', () => {
        sessionStorage.setItem(LOGIN_TRIGGER_KEY, 'javascript:evil');
        expect(takeLoginTrigger()).toBe('nav');
    });

    it('survives storage being unavailable', () => {
        const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
        expect(takeLoginTrigger()).toBe('nav');
        spy.mockRestore();
    });
});
