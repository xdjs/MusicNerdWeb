import { requireAdmin } from '@/lib/auth-helpers';
import { getAgentWorkData } from '@/server/utils/queries/agentWorkQueries';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.authenticated) return auth.response;

    const url = new URL(request.url);
    const auditPage = parseInt(url.searchParams.get('auditPage') ?? '1', 10) || 1;
    const auditLimit = parseInt(url.searchParams.get('auditLimit') ?? '50', 10) || 50;

    const data = await getAgentWorkData(auditPage, auditLimit);
    return Response.json(data);
  } catch (e) {
    console.error('[agent-work] GET error', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
