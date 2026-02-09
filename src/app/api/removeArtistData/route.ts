import { NextResponse } from "next/server";
import { removeArtistData } from "@/server/utils/queries/artistQueries";
import { requireAuth } from "@/lib/auth-helpers";

export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    if (!auth.authenticated) {
      return auth.response;
    }

    const { artistId, siteName } = await req.json();
    if (!artistId || !siteName) {
      return NextResponse.json({ message: "Missing parameters" }, { status: 400 });
    }

    const resp = await removeArtistData(artistId as string, siteName as string);
    if (resp.status === "error") {
      return NextResponse.json({ message: resp.message }, { status: 403 });
    }
    return NextResponse.json({ message: resp.message });
  } catch (e) {
    console.error("API removeArtistData error", e);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
