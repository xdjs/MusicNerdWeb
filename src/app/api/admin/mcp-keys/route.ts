import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/server/db/drizzle';
import { mcpApiKeys } from '@/server/db/schema';
import { desc } from 'drizzle-orm';
import crypto from 'crypto';
import { hashApiKey } from '@/app/api/mcp/auth';

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.authenticated) return auth.response;

    const keys = await db
      .select({
        id: mcpApiKeys.id,
        label: mcpApiKeys.label,
        keyHashPrefix: mcpApiKeys.keyHash,
        createdAt: mcpApiKeys.createdAt,
        revokedAt: mcpApiKeys.revokedAt,
      })
      .from(mcpApiKeys)
      .orderBy(desc(mcpApiKeys.createdAt));

    // Only expose first 8 chars of hash for identification
    const sanitized = keys.map((k) => ({
      ...k,
      keyHashPrefix: k.keyHashPrefix.slice(0, 8),
    }));

    return Response.json(sanitized);
  } catch (e) {
    console.error('[mcp-keys] GET error', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.authenticated) return auth.response;

    const body = await request.json();
    const { label } = body;

    if (!label || typeof label !== 'string' || label.trim().length === 0) {
      return Response.json({ error: 'Label is required' }, { status: 400 });
    }

    // Generate a cryptographically random key
    const rawKey = crypto.randomBytes(32).toString('hex');
    const keyHash = hashApiKey(rawKey);

    await db.insert(mcpApiKeys).values({
      keyHash,
      label: label.trim(),
    });

    // Return the raw key — this is the only time it's available
    return Response.json({ rawKey, label: label.trim() }, { status: 201 });
  } catch (e) {
    console.error('[mcp-keys] POST error', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
