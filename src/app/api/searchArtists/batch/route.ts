import { searchForArtistByName } from "@/server/utils/queries/artistQueries";


// Simple in-memory cache for search results (5 minute TTL)
const searchCache = new Map<string, { results: any[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
    const artists: string[] = Array.isArray(query?.artists)
    ? query.artists
    : typeof query?.artist === "string"
        ? [query.artist]
        : [];

    
    
    const cleaned = [...new Set(artists.map(q => q.trim()).filter(Boolean))];
    if (cleaned.length === 0) {
        return Response.json({ error: "No queries provided" }, { status: 400 });
    }

    const cacheKey = JSON.stringify(cleaned);
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
     return Response.json({ results: cached.results });
    }


    // Set a timeout for the entire operation to prevent Vercel timeouts
    const timeoutPromise = new Promise<Response>((_, reject) => 
      setTimeout(() => reject(new Error('Search timeout')), 12000) // 12 second timeout
    );

    const searchOperation = async (): Promise<Response> => {
      // Query database for artists
      const perArtist = await Promise.all (
        cleaned.map(async q => {
            const rows = await searchForArtistByName(q);
            const result = rows[0];
            return result
                ? {...result, matchScore: getMatchScore(result.name || " ", q)}
                : null;
        })
      );
      const allResults = perArtist;
      

      // Cache the results
      searchCache.set(query, { results: allResults, timestamp: Date.now() });

      return Response.json({ results: allResults });
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
