/**
 * The custom events Music Nerd sends to Vercel Web Analytics (#1258; add_artist and check_for_updates from #1535).
 * Two properties per event (Pro plan); the page URL travels with every event for free.
 * Change this file, docs/analytics.md and the fire point together.
 */
export type AnalyticsEvents = {
    search: { outcome: 'existing' | 'external' | 'none'; query: string };
    outbound_click: { platform: string; surface: string };
    add_link_submit: { platform: string | null; result: 'success' | 'invalid' | 'error' };
    claim: { step: 'start' | 'login_required' | 'submitted' | 'already_claimed' | 'error' };
    ask_question: { outcome: 'answered' | 'open_web' | 'error'; sources: number };
    latest_card_open: { kind: string; filter: string };
    interview_answer: { question: string; skipped: boolean };
    profile_edit: {
        action: 'link_add' | 'link_remove' | 'reorder' | 'photo' | 'vault_upload' | 'dismiss';
        target: string | null;
    };
    login: { trigger: LoginTrigger; new: boolean };
    add_artist: { surface: 'nav' | 'search'; step: 'start' | 'added' | 'exists' | 'error' };
    check_for_updates: { outcome: 'started' | 'error' };
};

export type AnalyticsEventName = keyof AnalyticsEvents;

/** Which surface asked the visitor to log in. */
export const LOGIN_TRIGGERS = ['nav', 'search_add', 'add_link', 'claim', 'add_artist', 'dashboard', 'please_login'] as const;
export type LoginTrigger = (typeof LOGIN_TRIGGERS)[number];

/** sessionStorage key carrying the surface that asked for the login. */
export const LOGIN_TRIGGER_KEY = 'mn-login-trigger';
