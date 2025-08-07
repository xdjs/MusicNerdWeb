import { NextResponse } from "next/server";
import { getArtistById } from "@/server/utils/queries/artistQueries";
import { getOpenAIBio } from "@/server/utils/queries/openAIQuery";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  // Set a timeout for the entire operation to prevent Vercel timeouts
  const timeoutPromise = new Promise<NextResponse>((_, reject) => 
    setTimeout(() => reject(new Error('Bio generation timeout')), 25000) // 25 second timeout
  );

  const bioOperation = async (): Promise<NextResponse> => {
    // Fetch artist row/object
    const artist = await getArtistById(params.id);
    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    //If the artist lacks vital info (all social media and platform links), then display a generic message
    const hasAnyPlatformData = !!(
      artist.spotify || artist.instagram || artist.x || artist.facebook || artist.soundcloud || 
      artist.youtube || artist.youtubechannel || artist.bandcamp || artist.patreon || 
      artist.twitch || artist.tiktok || artist.mixcloud || artist.discogs || artist.wikipedia ||
      artist.audius || artist.zora || artist.catalog || artist.opensea || artist.foundation ||
      artist.lastfm || artist.linkedin || artist.soundxyz || artist.mirror || artist.jaxsta ||
      artist.famousbirthdays || artist.songexploder || artist.colorsxstudios || artist.bandsintown ||
      artist.linktree || artist.onlyfans || artist.musicbrainz || artist.wikidata || artist.imdb ||
      artist.cameo || artist.farcaster || artist.lens || artist.ens || artist.tellie ||
      artist.bandcampfan || artist.spotifyusername || artist.supercollector || artist.glassnode
    );
    
    if (!artist.bio && !hasAnyPlatformData) {
      const testBio = "MusicNerd needs artist data to generate a summary. Try adding some to get started!";
      return NextResponse.json({ bio: testBio });
    }

    // If bio already exists in the database, return cached
    if (artist.bio && artist.bio.trim().length > 0) {
      return NextResponse.json({ bio: artist.bio });
    }

    //generate a bio and return it
    try {
      return await getOpenAIBio(params.id);
    //Error Handling
    } catch (err) {
      console.error("Error generating bio", err);
      return NextResponse.json({error: "failed to generate artist bio"}, {status: 500});
    }
  };

  try {
    // Race between the bio operation and timeout
    return await Promise.race([bioOperation(), timeoutPromise]);
  } catch (error: any) {
    console.error('Error in artist bio generation:', error);
    
    if (error instanceof Error && error.message === 'Bio generation timeout') {
      return NextResponse.json(
        { error: "Bio generation timed out. Please try again later.", bio: "Bio generation is taking longer than expected. Please refresh the page to try again." },
        { status: 408 }
      );
    }
    
    return NextResponse.json(
      { error: "Internal server error", bio: "Unable to generate bio at this time. Please try again later." },
      { status: 500 }
    );
  }
}

// ----------------------------------
// PUT /api/artistBio/[id]
// ----------------------------------
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const bio: string = body?.bio;

    if (!bio || typeof bio !== "string" || bio.trim().length === 0) {
      return NextResponse.json({ message: "Invalid bio" }, { status: 400 });
    }

    const { updateArtistBio } = await import("@/server/utils/queries/artistQueries");

    const result = await updateArtistBio(params.id, bio);

    if (result.status === "success") {
      return NextResponse.json({ message: result.message });
    }

    return NextResponse.json({ message: result.message }, { status: 403 });
  } catch (e) {
    console.error("[artistBio] PUT error", e);
    return NextResponse.json({ message: "Error updating bio" }, { status: 500 });
  }
}
