import { LOGIN_COMPLETED_KEY } from '@/lib/analytics/events';

/** Called just before the post-login reload; `takeCompletedLogin` reads it on the other side. */
export function markLoginCompleted(isNewUser: boolean): void {
    try {
        sessionStorage.setItem(LOGIN_COMPLETED_KEY, isNewUser ? 'new' : 'returning');
    } catch {
        // Storage blocked: this login goes unreported.
    }
}
