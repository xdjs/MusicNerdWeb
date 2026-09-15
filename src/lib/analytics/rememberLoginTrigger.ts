import { LOGIN_TRIGGER_KEY, type LoginTrigger } from '@/lib/analytics/events';

/** Records which surface asked for login, so the `login` event can say after the reload. */
export function rememberLoginTrigger(trigger: LoginTrigger): void {
    try {
        sessionStorage.setItem(LOGIN_TRIGGER_KEY, trigger);
    } catch {
        // Storage blocked: the event will report `nav`.
    }
}
