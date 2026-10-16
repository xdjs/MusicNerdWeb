import { getServerAuthSession } from "@/server/auth";
import { getDirectoryDiscoveryStatus } from "@/server/utils/directoryDiscovery/getDirectoryDiscoveryStatus";
export const dynamic = "force-dynamic";

/** Only the recent adding account or an admin can observe the directory operation. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const headers = { "Cache-Control": "private, no-store" };
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    return Response.json({ error: "Invalid artist" }, { status: 400, headers });
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id)
      return Response.json(
        { error: "Sign in to view discovery." },
        { status: 401, headers },
      );
    const status = await getDirectoryDiscoveryStatus(id, session.user.id);
    if (!status)
      return Response.json(
        { error: "Discovery is unavailable." },
        { status: 404, headers },
      );
    return Response.json(status, { headers });
  } catch {
    return Response.json(
      { error: "Discovery could not be checked." },
      { status: 503, headers },
    );
  }
}
