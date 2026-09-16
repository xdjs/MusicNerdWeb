import { requireAuth } from '@/lib/auth-helpers';
import { getProfileSummary } from '@/server/utils/profile/getProfileSummary';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;
  if (request.headers.get('X-Profile-Account') !== auth.userId) return Response.json({error: 'Account changed. Refresh and try again.'}, {status: 409});
  try {
    return Response.json({...await getProfileSummary(auth.userId), userId: auth.userId}, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return Response.json({ error: 'Could not load your contributions. Try again.' }, { status: 503 });
  }
}
