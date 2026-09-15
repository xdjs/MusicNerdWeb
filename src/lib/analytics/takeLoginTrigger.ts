import { LOGIN_TRIGGERS, LOGIN_TRIGGER_KEY, type LoginTrigger } from '@/lib/analytics/events';

/** The trigger stored by `rememberLoginTrigger`, consumed once; `nav` when there is none. */
export function takeLoginTrigger(): LoginTrigger {
    try {
        const stored = sessionStorage.getItem(LOGIN_TRIGGER_KEY);
        sessionStorage.removeItem(LOGIN_TRIGGER_KEY);
        return (LOGIN_TRIGGERS as readonly string[]).includes(stored ?? '') ? (stored as LoginTrigger) : 'nav';
    } catch {
        return 'nav';
    }
}
