import { getServerAuthSession } from "@/server/auth";
import { canEditArtist } from "@/server/utils/artistEditAuth";
import { getLoreClaimGeneration } from "@/server/utils/queries/lorePersistence";
import { withArtistOperation } from "@/server/utils/artistOperationContext";
import { OwnershipChangedError } from "@/server/utils/queries/ownershipWrites";
import { requestLatestRefresh } from "@/server/utils/latest/requestLatestRefresh";
import { getLatestRefresh } from "@/server/utils/latest/getLatestRefresh";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
async function handle(_request: Request, context: Context, write: boolean) {
  const { id } = await context.params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    return Response.json({ error: "Invalid artist" }, { status: 400 });
  try {
    const session = await getServerAuthSession();
    const userId = session?.user?.id;
    if (!userId)
      return Response.json(
        { error: "Sign in to update Latest." },
        { status: 401 },
      );
    if (!(await canEditArtist(userId, id)))
      return Response.json(
        { error: "Only this artist or an admin can update Latest." },
        { status: 403 },
      );
    if (write) {
      const claimId = await getLoreClaimGeneration(id);
      await withArtistOperation(
        id,
        { userId, expectedClaimId: claimId, trigger: "manual_latest_refresh" },
        () => requestLatestRefresh(id),
      );
    }
    return Response.json(
      { refresh: await getLatestRefresh(id) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof OwnershipChangedError
            ? "Your access changed. Reload the profile."
            : "Latest could not be checked. Please try again.",
      },
      { status: error instanceof OwnershipChangedError ? 403 : 503 },
    );
  }
}
export async function GET(request: Request, context: Context) {
  return handle(request, context, false);
}
export async function POST(request: Request, context: Context) {
  return handle(request, context, true);
}
