import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/server/db/drizzle';
import { sql } from 'drizzle-orm';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;
  const { id } = await params;
  if (auth.session.user.id !== id) return Response.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const rows = await db.execute(sql`update users set username_prompted_at = now()
      where id = ${id}::uuid and username_needs_confirmation = true and username_prompted_at is null returning id`);
    return Response.json({ showPrompt: rows.length > 0 });
  } catch {
    return Response.json({ error: 'Could not load your user name setup.' }, { status: 503 });
  }
}
