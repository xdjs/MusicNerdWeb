import { getServerAuthSession } from '@/server/auth';
import { db } from '@/server/db/drizzle';
import { ugcresearch } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return Response.json({ count: 0 });
    }

    const results = await db.query.ugcresearch.findMany({
      where: and(
        eq(ugcresearch.userId, session.user.id),
        eq(ugcresearch.accepted, true),
      ),
    });

    return Response.json({ count: results.length });
  } catch (error) {
    console.error('[approvedUGCCount] Error:', error);
    return Response.json({ count: 0 });
  }
}
