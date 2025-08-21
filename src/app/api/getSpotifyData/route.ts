import { getArtistById } from "@/server/utils/queries/artistQueries";
import { getSpotifyHeaders, getSpotifyArtist, getSpotifyArtists } from "@/server/utils/queries/externalApiQueries";
import { NextResponse } from "next/server";

//format: 
// Single: https://api.musicnerd.xyz/api/getSpotifyData?spotifyId=[YOUR SPOTIFY ID]
// Batch: https://api.musicnerd.xyz/api/getSpotifyData?spotifyIds=id1,id2,id3
// POST: { "spotifyIds": ["id1", "id2", "id3"] }

// CORS configuration for this route
const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_ALLOWED_ORIGIN || "*";
const CORS_HEADERS: HeadersInit = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
    const spotifyIds = searchParams.get("spotifyIds")?.split(',').map(id => id.trim()).filter(Boolean);
    
    // Handle batch query via query params
    if (spotifyIds && spotifyIds.length > 0) {
        if (spotifyIds.length > 50) {
            return NextResponse.json({ error: "Maximum 50 IDs allowed per request" }, { status: 400, headers: CORS_HEADERS });
        }
        
        try {
            const headers = await getSpotifyHeaders();
            const artists = await getSpotifyArtists(spotifyIds, headers);
            return NextResponse.json({ data: artists }, { headers: CORS_HEADERS });
        } catch (error) {
            return NextResponse.json({ error: "Failed to fetch artist data" }, { status: 502, headers: CORS_HEADERS });
        }
    }
    
    // Handle single query (existing behavior)
    if (!spotifyId) return NextResponse.json({ error: "spotifyId or spotifyIds is required" }, { status: 400, headers: CORS_HEADERS });
  
    const headers = await getSpotifyHeaders();
    const { data, error } = await getSpotifyArtist(spotifyId, headers);
    if (error) return NextResponse.json({ error }, { status: 502, headers: CORS_HEADERS });
  
    return NextResponse.json({ data }, { headers: CORS_HEADERS });
}

export async function POST(req: Request) {
    try {
        const { spotifyIds } = await req.json();
        
        if (!Array.isArray(spotifyIds) || spotifyIds.length === 0) {
            return NextResponse.json({ error: "spotifyIds array is required" }, { status: 400, headers: CORS_HEADERS });
        }
        
        const cleaned = [...new Set(spotifyIds.map((id: string) => id.trim()).filter(Boolean))];
        if (cleaned.length === 0) {
            return NextResponse.json({ error: "No valid Spotify IDs provided" }, { status: 400, headers: CORS_HEADERS });
        }
        
        if (cleaned.length > 50) {
            return NextResponse.json({ error: "Maximum 50 IDs allowed per request" }, { status: 400, headers: CORS_HEADERS });
        }
        
        // Set timeout for the operation
        const timeoutPromise = new Promise<NextResponse>((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 12000)
        );
        
        const fetchOperation = async (): Promise<NextResponse> => {
            const headers = await getSpotifyHeaders();
            const artists = await getSpotifyArtists(cleaned, headers);
            return NextResponse.json({ data: artists }, { headers: CORS_HEADERS });
        };
        
        return await Promise.race([fetchOperation(), timeoutPromise]);
        
    } catch (error) {
        console.error('Error in batch Spotify data fetch:', error);
        
        if (error instanceof Error && error.message === 'Request timeout') {
            return NextResponse.json({ error: "Request timed out" }, { status: 408, headers: CORS_HEADERS });
        }
        
        return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: CORS_HEADERS });
    }
}