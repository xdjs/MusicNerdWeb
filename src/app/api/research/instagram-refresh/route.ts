import { APIFY_API_TOKEN, CRON_SECRET, INSTAGRAM_REFRESH_ENABLED } from '@/env';
import { queueScheduledInstagram } from '@/server/utils/instagramRefresh/queueScheduledInstagram';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request): Promise<Response> {
    if (!CRON_SECRET || req.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!INSTAGRAM_REFRESH_ENABLED || !APIFY_API_TOKEN) return Response.json({ queued: 0, disabled: true });
    try {
        return Response.json({ queued: await queueScheduledInstagram() });
    } catch {
        return Response.json({ error: 'Instagram scheduling failed' }, { status: 500 });
    }
}
