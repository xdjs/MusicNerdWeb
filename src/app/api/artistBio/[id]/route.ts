import { NextResponse } from "next/server";
import { getArtistById } from "@/server/utils/queries/artistQueries";
import { generateArtistBio } from "@/server/utils/queries/artistBioQuery";
import { requireArtistEditor } from "@/lib/auth-helpers";
import { getLoreClaimGeneration } from '@/server/utils/queries/lorePersistence';
import { MAX_BIO_LENGTH, ABOUT_EMPTY_STATE, isRealBio } from "@/lib/bio/bioConstants";

// Reads stay dynamic; explicit editor generation uses stored Lore only.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// CORS configuration for this route
const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_ALLOWED_ORIGIN || "*";
const CORS_HEADERS: HeadersInit = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// Re-wrap an auth failure (from requireArtistEditor) with this route's CORS headers so it
// matches every other response the route returns. Shared by GET (forced regen) and PUT.
async function corsAuthFailure(auth: { response: Response }): Promise<NextResponse> {
  return NextResponse.json(await auth.response.json(), {
    status: auth.response.status,
    headers: CORS_HEADERS,
  });
}



export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (new URL(request.url).searchParams.get("regenerate") === "true") {
      const expectedClaimId = await getLoreClaimGeneration(id);
      const auth = await requireArtistEditor(id);
      if (!auth.authenticated) return corsAuthFailure(auth);
      const response = await generateArtistBio(id, { userId: auth.userId, expectedClaimId });
      Object.entries(CORS_HEADERS).forEach(([key, value]) => response.headers.set(key, String(value)));
      return response;
    }
    const artist = await getArtistById(id);
    if (!artist) return NextResponse.json({ error: "Artist not found" }, { status: 404, headers: CORS_HEADERS });
    // A cache miss is a read, including profiles with pending Lore or identity links.
    return NextResponse.json({ bio: isRealBio(artist.bio) ? artist.bio : ABOUT_EMPTY_STATE }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('[About] Read failed', error);
    return NextResponse.json({ error: "Unable to read About. Please try again." }, { status: 500, headers: CORS_HEADERS });
  }
}

// ----------------------------------
// PUT /api/artistBio/[id]
// ----------------------------------
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const expectedClaimId = await getLoreClaimGeneration(id);
    const auth = await requireArtistEditor(id);
    if (!auth.authenticated) {
      return corsAuthFailure(auth);
    }
    const body = await request.json();
    const bio: string = body?.bio;
    const regenerate: boolean = body?.regenerate || false;

    // For regeneration, bio can be empty
    if (!regenerate && (!bio || typeof bio !== "string" || bio.trim().length === 0)) {
      return NextResponse.json({ message: "Invalid bio" }, { status: 400, headers: CORS_HEADERS });
    }

    if (!regenerate && bio.length > MAX_BIO_LENGTH) {
      return NextResponse.json(
        { message: `Bio must be ${MAX_BIO_LENGTH} characters or fewer` },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const { updateArtistBio } = await import("@/server/utils/queries/artistQueries");

    const result = await updateArtistBio(id, bio, regenerate, { userId: auth.userId, expectedClaimId });

    if (result.status === "success") {
      return NextResponse.json({ 
        message: result.message,
        bio: result.data // Include generated bio for regeneration
      }, { headers: CORS_HEADERS });
    }

    return NextResponse.json({ message: result.message }, { status: 500, headers: CORS_HEADERS });
  } catch (e) {
    console.error("[artistBio] PUT error", e);
    return NextResponse.json({ message: "Error updating bio" }, { status: 500, headers: CORS_HEADERS });
  }
}
