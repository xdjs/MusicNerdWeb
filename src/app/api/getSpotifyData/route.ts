import { getArtistById } from "@/server/utils/queries/artistQueries";
import { getSpotifyHeaders, getSpotifyArtist } from "@/server/utils/queries/externalApiQueries";
import { NextResponse } from "next/server";

//format: https://api.musicnerd.xyz/api/getSpotifyData/spotifyId=[YOUR SPOTIFY ID]

// CORS configuration for this route
const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_ALLOWED_ORIGIN || "*";
const CORS_HEADERS: HeadersInit = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const spotifyId = searchParams.get("spotifyId")?.trim();
    if (!spotifyId) return NextResponse.json({ error: "spotifyId is required" }, { status: 400, headers: CORS_HEADERS });
  
    const headers = await getSpotifyHeaders();
    const { data, error } = await getSpotifyArtist(spotifyId, headers);
    if (error) return NextResponse.json({ error }, { status: 502, headers: CORS_HEADERS });
  
    return NextResponse.json({ data }, { headers: CORS_HEADERS });
  }