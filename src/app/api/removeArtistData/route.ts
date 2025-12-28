import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/server/auth";
import { getUserById } from "@/server/utils/queries/userQueries";
import { removeArtistData } from "@/server/utils/queries/artistQueries";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/apiErrors";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    // Check if user is whitelisted
    const user = await getUserById(session.user.id);
    if (!user?.isWhiteListed && !user?.isAdmin) {
      return forbiddenResponse("Whitelist access required");
    }

    const { artistId, siteName } = await req.json();

    if (!artistId || !siteName) {
      return NextResponse.json(
        { message: "Missing artistId or siteName" },
        { status: 400 }
      );
    }

    const resp = await removeArtistData(artistId as string, siteName as string);

    if (resp.status === "error") {
      return NextResponse.json(
        { message: resp.message },
        { status: 403 }
      );
    }

    return NextResponse.json({ message: resp.message });
  } catch (error) {
    console.error("[API] removeArtistData error", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
