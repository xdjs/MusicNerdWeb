import { LOGIN_COMPLETED_KEY, type AnalyticsEvents } from '@/lib/analytics/events';
import { takeLoginTrigger } from '@/lib/analytics/takeLoginTrigger';

/** The `login` event for a login that just completed, consumed once; `null` when none did. */
export function takeCompletedLogin(): AnalyticsEvents['login'] | null {
    try {
        const completed = sessionStorage.getItem(LOGIN_COMPLETED_KEY);
        if (completed !== 'new' && completed !== 'returning') return null;
        sessionStorage.removeItem(LOGIN_COMPLETED_KEY);
        return { trigger: takeLoginTrigger(), new: completed === 'new' };
    } catch {
        return null;
    }
}
