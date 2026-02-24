import { getServerAuthSession } from '@/server/auth';
import { getUserById } from '@/server/utils/queries/userQueries';
import { getPendingUGC } from '@/server/utils/queries/artistQueries';

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return Response.json({ count: 0 });
    }

    const user = await getUserById(session.user.id);
    if (!user?.isAdmin) {
      return Response.json({ count: 0 });
    }

    const pendingUGC = await getPendingUGC();
    return Response.json({ count: pendingUGC.length });
  } catch (error) {
    console.error('[pendingUGCCount] Error:', error);
    return Response.json({ count: 0 });
  }
}
