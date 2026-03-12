import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/server/db/drizzle';
import { mcpApiKeys } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.authenticated) return auth.response;

    const { id } = await params;

    const result = await db
      .update(mcpApiKeys)
      .set({ revokedAt: new Date().toISOString() })
      .where(eq(mcpApiKeys.id, id))
      .returning({ id: mcpApiKeys.id });

    if (result.length === 0) {
      return Response.json({ error: 'Key not found' }, { status: 404 });
    }

    return Response.json({ message: 'Key revoked' });
  } catch (e) {
    console.error('[mcp-keys] revoke error', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
