import { requireAdmin } from '@/lib/auth-helpers';
import { getAgentWorkSummary, getAgentWorkDetails } from '@/server/utils/queries/agentWorkQueries';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const t0 = performance.now();
  try {
    const auth = await requireAdmin();
    if (!auth.authenticated) return auth.response;

    const url = new URL(request.url);
    const sections = url.searchParams.get('sections');

    if (sections === 'details') {
      const auditPage = parseInt(url.searchParams.get('auditPage') ?? '1', 10) || 1;
      const auditLimit = parseInt(url.searchParams.get('auditLimit') ?? '50', 10) || 50;
      const data = await getAgentWorkDetails(auditPage, auditLimit);
      console.debug(`[agent-work] GET details ${Math.round(performance.now() - t0)}ms`);
      return Response.json(data);
    }

    const data = await getAgentWorkSummary();
    console.debug(`[agent-work] GET summary ${Math.round(performance.now() - t0)}ms`);
    return Response.json(data);
  } catch (e) {
    console.error('[agent-work] GET error', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
