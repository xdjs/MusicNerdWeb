import { requestLogin } from '../requestLogin';
import { LOGIN_TRIGGER_KEY } from '@/lib/analytics/events';

describe('requestLogin', () => {
    beforeEach(() => { sessionStorage.clear(); document.body.innerHTML = ''; });

    it('records the trigger and clicks the nav login button', () => {
        const btn = document.createElement('button');
        btn.id = 'login-btn';
        const onClick = jest.fn();
        btn.addEventListener('click', onClick);
        document.body.appendChild(btn);

        expect(requestLogin('add_link')).toBe(true);
        expect(onClick).toHaveBeenCalledTimes(1);
        expect(sessionStorage.getItem(LOGIN_TRIGGER_KEY)).toBe('add_link');
    });

    it('returns false when the nav button is not on the page', () => {
        expect(requestLogin('claim')).toBe(false);
    });
});
