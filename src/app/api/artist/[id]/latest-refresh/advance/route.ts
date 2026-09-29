import { getServerAuthSession } from "@/server/auth";
import { canEditArtist } from "@/server/utils/artistEditAuth";
import { advanceResearch } from "@/server/utils/researchRunner";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    return Response.json({ error: "Invalid artist" }, { status: 400 });
  const session = await getServerAuthSession();
  if (!session?.user?.id)
    return Response.json({ error: "Sign in required" }, { status: 401 });
  if (!(await canEditArtist(session.user.id, id)))
    return Response.json({ error: "Access denied" }, { status: 403 });
  await advanceResearch({
    artistId: id,
    budgetMs: 56000,
    kinds: ["latest_refresh"],
  });
  return Response.json(
    { ok: true },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
