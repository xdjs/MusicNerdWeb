import { APIFY_API_TOKEN } from '@/env';
import { INSTAGRAM_REFRESH_CENTS, INSTAGRAM_REFRESH_LIMIT } from './limits';

/** Caller must durably reserve and mark the attempt before calling this once. */
export async function startLatestInstagramScrape(handle: string, since: string): Promise<string | null> {
    if (!APIFY_API_TOKEN || !/^[a-zA-Z0-9._]{1,30}$/.test(handle) || !Number.isFinite(Date.parse(since))) return null;
    const params = new URLSearchParams({ maxTotalChargeUsd: String(INSTAGRAM_REFRESH_CENTS / 100),
        maxItems: String(INSTAGRAM_REFRESH_LIMIT), timeout: '180', restartOnError: 'false' });
    try {
        const response = await fetch(`https://api.apify.com/v2/acts/apify~instagram-scraper/runs?${params}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${APIFY_API_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ directUrls: [`https://www.instagram.com/${handle}/`], resultsType: 'posts',
                resultsLimit: INSTAGRAM_REFRESH_LIMIT, onlyPostsNewerThan: since, addParentData: false }),
            signal: AbortSignal.timeout(20_000),
        });
        if (!response.ok) return null;
        const body = await response.json() as { data?: { id?: unknown } };
        return typeof body.data?.id === 'string' && body.data.id ? body.data.id : null;
    } catch {
        // Never retry this POST or expose request/auth details through job errors.
        return null;
    }
}
