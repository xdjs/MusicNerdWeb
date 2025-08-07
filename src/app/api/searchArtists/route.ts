import { searchForArtistByName, getAllSpotifyIds } from "@/server/utils/queries/artistQueries";
import { getSpotifyHeaders } from "@/server/utils/queries/externalApiQueries";
import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/db";
import { bookmarks } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import axios from "axios";

// Simple in-memory cache for search results (5 minute TTL)
const searchCache = new Map<string, { results: any[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Defines the structure of a Spotify artist's image metadata
interface SpotifyArtistImage {
  url: string;
  height: number;
  width: number;
}

// Defines the complete structure of a Spotify artist object from their API
interface SpotifyArtist {
  id: string;
  name: string;
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  followers: {
    total: number;
  };
  genres: string[];
  type: string;
  uri: string;
  external_urls: {
    spotify: string;
  };
}

// Defines the structure of the Spotify search API response
interface SpotifySearchResponse {
  artists: {
    items: SpotifyArtist[];
  };
}

// ----------------------------------
// Helper to calculate how much content an artist has
// ----------------------------------
const LINK_FIELDS = [
  "bandcamp",
  "youtube",
  "youtubechannel",
  "instagram",
  "x",
  "facebook",
  "tiktok",
  "soundcloud",
  "patreon",
  "twitter", // alias for x (legacy)
  "linktree",
  "spotifyusername",
  "bandsintown",
  "audius",
  "zora",
  "catalog",
  "opensea",
  "foundation",
  "mirror",
  "soundxyz",
  "twitch",
  "wikidata",
  "wikipedia"
] as const;

type LinkField = (typeof LINK_FIELDS)[number];

function getLinkCount(artist: Record<string, any>): number {
  return LINK_FIELDS.reduce((count, field) => {
    const val = artist[field as LinkField];
    return count + (val !== null && val !== undefined && val !== "" ? 1 : 0);
  }, 0);
}

// Helper function to calculate match score for sorting
function getMatchScore(name: string, query: string) {
  const nameLower = name.toLowerCase();
  const queryLower = query.toLowerCase();

  // Exact match gets highest priority (0)
  if (nameLower === queryLower) return 0;
  
  // Starts with match gets second priority (1)
  if (nameLower.startsWith(queryLower)) return 1;
  
  // Contains match gets third priority (2)
  if (nameLower.includes(queryLower)) return 2;
  
  // No direct match, will be sorted by similarity (3)
  return 3;
}

// POST endpoint handler for combined artist search across local database and Spotify
// Params:
//      req: Request object containing search query in the body
// Returns:
//      Response with combined and sorted search results or error message
export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    
    if (!query || typeof query !== 'string') {
      return Response.json(
        { error: "Invalid query parameter" },
        { status: 400 }
      );
    }

    // Get user session and bookmarks for prioritization
    const session = await getServerAuthSession();
    let userBookmarks: Set<string> = new Set();
    
    if (session?.user?.id) {
      try {
        const bookmarkResults = await db
          .select({ artistId: bookmarks.artistId })
          .from(bookmarks)
          .where(eq(bookmarks.userId, session.user.id));
        
        userBookmarks = new Set(bookmarkResults.map(b => b.artistId));
      } catch (error) {
        console.error('Failed to fetch user bookmarks:', error);
        // Continue without bookmark prioritization
      }
    }

    // Check cache first (use user-specific cache key for authenticated users)
    const cacheKey = session?.user?.id ? `${query}_${session.user.id}` : query;
    const cachedResult = searchCache.get(cacheKey);
    if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL) {
      return Response.json({ results: cachedResult.results });
    }

    // Set a timeout for the entire operation to prevent Vercel timeouts
    const timeoutPromise = new Promise<Response>((_, reject) => 
      setTimeout(() => reject(new Error('Search timeout')), 12000) // 12 second timeout
    );

    const searchOperation = async (): Promise<Response> => {
      // Parallel execution of database search and Spotify headers
      const [dbResults, spotifyHeaders] = await Promise.all([
        searchForArtistByName(query),
        getSpotifyHeaders()
      ]);

      // Search Spotify's API for matching artists first (faster than fetching individual artists)
      let spotifyArtists: any[] = [];
      try {
        const spotifyResponse = await axios.get<SpotifySearchResponse>(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=10`,
          spotifyHeaders
        );
        
        // Create a Set of existing Spotify IDs from DB results for fast filtering
        const existingSpotifyIds = new Set(
          dbResults.map(artist => artist.spotify).filter(Boolean)
        );

        // Filter out existing artists from Spotify results
        spotifyArtists = spotifyResponse.data.artists.items
          .filter((spotifyArtist: SpotifyArtist) => !existingSpotifyIds.has(spotifyArtist.id))
          .map((artist: SpotifyArtist) => ({
            id: null,
            name: artist.name,
            spotify: artist.id,
            images: artist.images,
            isSpotifyOnly: true,
            matchScore: getMatchScore(artist.name, query),
            linkCount: 0,
            isBookmarked: false // Spotify-only artists can't be bookmarked yet
          }));
      } catch (error) {
        console.error('Spotify search failed:', error);
        // Continue without Spotify results rather than failing entirely
      }

      // Fetch Spotify data for database artists (with concurrency limit)
      const dbArtistsWithImages = await Promise.all(
        dbResults.map(async (artist) => {
          const baseArtist = {
            ...artist,
            isSpotifyOnly: false,
            matchScore: getMatchScore(artist.name || "", query),
            linkCount: getLinkCount(artist),
            isBookmarked: userBookmarks.has(artist.id)
          };
          if (artist.spotify) {
            try {
              const spotifyData = await axios.get<SpotifyArtist>(
                `https://api.spotify.com/v1/artists/${artist.spotify}`,
                { ...spotifyHeaders, timeout: 3000 } // 3 second timeout per request
              );
              return {
                ...baseArtist,
                images: spotifyData.data.images,
              };
            } catch (error) {
              console.error(`Failed to fetch Spotify data for artist ${artist.spotify}:`, error);
              return baseArtist;
            }
          }
          return baseArtist;
        })
      );

      // Combine all results and sort them by bookmark status, then match score and name
      const combinedResults = [...dbArtistsWithImages, ...spotifyArtists]
        .sort((a, b) => {
          // First priority: bookmarked artists come first
          if (a.isBookmarked !== b.isBookmarked) {
            return a.isBookmarked ? -1 : 1; // true (bookmarked) comes before false
          }

          // Second priority: sort by match score
          if (a.matchScore !== b.matchScore) {
            return a.matchScore - b.matchScore;
          }

          // Third priority: prefer artists with more content (higher linkCount)
          if ((a.linkCount ?? 0) !== (b.linkCount ?? 0)) {
            return (b.linkCount ?? 0) - (a.linkCount ?? 0);
          }

          // Fallback: alphabetical by name
          return (a.name || "").localeCompare(b.name || "");
        });

      // Cache the results
      searchCache.set(cacheKey, { results: combinedResults, timestamp: Date.now() });

      return Response.json({ results: combinedResults });
    };

    // Race between the search operation and timeout
    return await Promise.race([searchOperation(), timeoutPromise]);
    
  } catch (error) {
    console.error('Error in search artists:', error);
    
    if (error instanceof Error && error.message === 'Search timeout') {
      return Response.json(
        { error: "Search timed out. Please try a more specific search term." },
        { status: 408 }
      );
    }
    
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
