import { getServerAuthSession } from "@/server/auth";
import { getApprovedClaimByUserId } from "@/server/utils/queries/dashboardQueries";

export const dynamic = "force-dynamic";

export async function GET() {
    const start = performance.now();
    try {
        const session = await getServerAuthSession();
        if (!session?.user?.id) {
            return Response.json({ hasClaim: false });
        }

        const claim = await getApprovedClaimByUserId(session.user.id);
        return Response.json({ hasClaim: !!claim });
    } catch {
        return Response.json({ hasClaim: false });
    } finally {
        console.debug(`[has-claim] GET took ${performance.now() - start}ms`);
    }
}
