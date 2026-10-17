import { and, eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/server/db/drizzle';
import { artistBioCorrections } from '@/server/db/schema';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.authenticated) return auth.response;
  const { id } = await params;
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) return Response.json({ error: 'Invalid report ID' }, { status: 400 });
  const body = await request.json().catch(() => null);
  if (!['resolved', 'dismissed'].includes(body?.status)) return Response.json({ error: 'Invalid review status' }, { status: 400 });
  const [updated] = await db.update(artistBioCorrections).set({ status: body.status, reviewedAt: new Date().toISOString(), reviewedBy: auth.userId }).where(and(eq(artistBioCorrections.id, id), eq(artistBioCorrections.status, 'pending'))).returning({ id: artistBioCorrections.id });
  if (!updated) return Response.json({ error: 'Report was already reviewed or does not exist' }, { status: 409 });
  return Response.json({ success: true });
}
