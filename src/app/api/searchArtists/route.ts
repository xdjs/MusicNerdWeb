import { searchForArtistByName, getAllSpotifyIds } from "@/server/utils/queries/artistQueries";
import { getSpotifyHeaders } from "@/server/utils/queries/externalApiQueries";
import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/db/drizzle";
import { bookmarks, artists } from "@/server/db/schema";
import { eq, inArray } from "drizzle-orm";
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
    
    if (typeof query !== 'string') {
      return Response.json(
        { error: "Invalid query parameter" },
        { status: 400 }
      );
    }
    
    // Allow empty queries to show bookmarks

    // Get user session and bookmarks for prioritization
    const session = await getServerAuthSession();
    let userBookmarkedArtists: any[] = [];
    let userBookmarkIds: Set<string> = new Set();
    let filteredBookmarks: any[] = [];
    
    if (session?.user?.id) {
      try {
        const bookmarkResults = await db
          .select({
            artistId: bookmarks.artistId,
            artistName: bookmarks.artistName,
            imageUrl: bookmarks.imageUrl,
            orderIndex: bookmarks.orderIndex
          })
          .from(bookmarks)
          .where(eq(bookmarks.userId, session.user.id))
          .orderBy(bookmarks.orderIndex);
        
        userBookmarkIds = new Set(bookmarkResults.map(b => b.artistId));
        
        // Filter bookmarks by search query
        filteredBookmarks = bookmarkResults.filter(bookmark => {
          // If no query (empty search), show all bookmarks
          if (!query || query.trim() === '') {
            return true;
          }
          // Only include bookmarks that match the search query
          const name = bookmark.artistName?.toLowerCase() || '';
          const queryLower = query.toLowerCase();
          return name.includes(queryLower);
        });


        
      } catch (error) {
        console.error('Failed to fetch user bookmarks:', error);
        // Continue without bookmark prioritization
      }
    }

    // Check cache first (use user-specific cache key for authenticated users)
    // Skip cache for empty queries to ensure fresh bookmark data
    const cacheKey = session?.user?.id ? `${query}_${session.user.id}` : query;
    if (query && query.trim()) {
      const cachedResult = searchCache.get(cacheKey);
      if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL) {
        return Response.json({ results: cachedResult.results });
      }
    }

    // Set a timeout for the entire operation to prevent Vercel timeouts
    const timeoutPromise = new Promise<Response>((_, reject) => 
      setTimeout(() => reject(new Error('Search timeout')), 12000) // 12 second timeout
    );

    const searchOperation = async (): Promise<Response> => {
      // Get Spotify headers first
      const spotifyHeaders = await getSpotifyHeaders();
      
      // Only search database if there's a query, otherwise use empty results
      const dbResults = query && query.trim() ? await searchForArtistByName(query) : [];

      // Process bookmarks with Spotify data if user is authenticated
      if (session?.user?.id && filteredBookmarks.length > 0) {
        const bookmarkArtistIds = filteredBookmarks.map(b => b.artistId);
        
        // Query full artist data by IDs
        const fullBookmarkData = await db
          .select()
          .from(artists)
          .where(inArray(artists.id, bookmarkArtistIds));
        
        // Fetch Spotify images for bookmarked artists
        const bookmarkedArtistsWithImages = await Promise.all(
          filteredBookmarks.map(async (bookmark) => {
            const fullArtist = fullBookmarkData.find(artist => artist.id === bookmark.artistId);
            if (fullArtist) {
              const baseArtist = {
                ...fullArtist,
                isSpotifyOnly: false,
                isBookmarked: true,
                matchScore: getMatchScore(bookmark.artistName || "", query),
                linkCount: getLinkCount(fullArtist),
                orderIndex: bookmark.orderIndex
              };
              
              // Fetch Spotify image if available
              if (fullArtist.spotify) {
                try {
                  const spotifyData = await axios.get<SpotifyArtist>(
                    `https://api.spotify.com/v1/artists/${fullArtist.spotify}`,
                    { ...spotifyHeaders, timeout: 3000 }
                  );
                  return {
                    ...baseArtist,
                    images: spotifyData.data.images,
                  };
                } catch (error) {
                  console.error(`Failed to fetch Spotify data for bookmarked artist ${fullArtist.spotify}:`, error);
                  return baseArtist;
                }
              }
              return baseArtist;
            } else {
              // Fallback to bookmark data if full artist not found
              return {
                id: bookmark.artistId,
                name: bookmark.artistName,
                imageUrl: bookmark.imageUrl,
                isSpotifyOnly: false,
                isBookmarked: true,
                matchScore: getMatchScore(bookmark.artistName || "", query),
                linkCount: 0,
                orderIndex: bookmark.orderIndex
              };
            }
          })
        );

        userBookmarkedArtists = bookmarkedArtistsWithImages
          .sort((a, b) => {
            // For empty search, maintain original bookmark order
            if (!query || query.trim() === '') {
              return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
            }
            // For search with query, sort by match score first, then by original order
            if (a.matchScore !== b.matchScore) {
              return a.matchScore - b.matchScore;
            }
            return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
          });
      }

      // Search Spotify's API for matching artists (only if there's a query)
      let spotifyArtists: any[] = [];
      if (query && query.trim()) {
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
      }

      // Fetch Spotify data for database artists (with concurrency limit)
      const dbArtistsWithImages = await Promise.all(
        dbResults.map(async (artist) => {
          const baseArtist = {
            ...artist,
            isSpotifyOnly: false,
            matchScore: getMatchScore(artist.name || "", query),
            linkCount: getLinkCount(artist),
            isBookmarked: userBookmarkIds.has(artist.id)
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

      // Filter out bookmarked artists from regular search results to avoid duplicates
      // Only filter out bookmarks that actually matched the search query
      const matchingBookmarkIds = new Set(userBookmarkedArtists.map(bookmark => bookmark.id));
      const nonBookmarkedDbResults = dbArtistsWithImages.filter(artist => !matchingBookmarkIds.has(artist.id));
      const nonBookmarkedSpotifyResults = spotifyArtists; // Spotify-only artists can't be bookmarked
      
      // Sort regular search results by match score and relevance
      const regularSearchResults = [...nonBookmarkedDbResults, ...nonBookmarkedSpotifyResults]
        .sort((a, b) => {
          // Sort by match score
          if (a.matchScore !== b.matchScore) {
            return a.matchScore - b.matchScore;
          }

          // Prefer artists with more content (higher linkCount)
          if ((a.linkCount ?? 0) !== (b.linkCount ?? 0)) {
            return (b.linkCount ?? 0) - (a.linkCount ?? 0);
          }

          // Fallback: alphabetical by name
          return (a.name || "").localeCompare(b.name || "");
        });

      // Combine bookmarks first (in user's order), then regular search results
      const combinedResults = [...userBookmarkedArtists, ...regularSearchResults];

      // Cache the results (only for non-empty queries)
      if (query && query.trim()) {
        searchCache.set(cacheKey, { results: combinedResults, timestamp: Date.now() });
      }

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
