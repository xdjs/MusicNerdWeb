import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { searchForArtistByName, getArtistById } from "@/server/utils/queries/artistQueries";
import { toArtistSummary } from "./transformers/artist-summary";
import { toArtistDetail } from "./transformers/artist-detail";

// Create the MCP server instance
const server = new McpServer({
  name: "Music Nerd",
  version: "1.0.0",
});

// Register the search_artists tool
server.registerTool(
  "search_artists",
  {
    title: "Search Artists",
    description: "Search for artists in the MusicNerd database by name",
    inputSchema: {
      query: z.string().describe("The search query to find artists by name"),
      limit: z.number().optional().default(10).describe("Maximum number of results to return (default 10, max 50)"),
    },
  },
  async ({ query, limit }) => {
    console.log(`[MCP] search_artists called with query="${query}", limit=${limit}`);

    try {
      // Handle empty query string - return empty results per PRD spec
      const trimmedQuery = query?.trim() ?? "";
      if (trimmedQuery === "") {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                artists: [],
                totalResults: 0,
              }, null, 2),
            },
          ],
        };
      }

      // Clamp limit to max 50
      const effectiveLimit = Math.min(limit ?? 10, 50);

      const artists = await searchForArtistByName(trimmedQuery);
      const limitedArtists = artists.slice(0, effectiveLimit);
      const artistSummaries = limitedArtists.map(toArtistSummary);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              artists: artistSummaries,
              totalResults: artistSummaries.length,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("[MCP] search_artists error:", error);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: "Failed to search artists",
              code: "INTERNAL_ERROR",
            }),
          },
        ],
        isError: true,
      };
    }
  }
);

// Register the get_artist tool
server.registerTool(
  "get_artist",
  {
    title: "Get Artist",
    description: "Get detailed information about an artist by their MusicNerd ID",
    inputSchema: {
      id: z.string().uuid().describe("The UUID of the artist in MusicNerd"),
    },
  },
  async ({ id }) => {
    console.log(`[MCP] get_artist called with id="${id}"`);

    try {
      const artist = await getArtistById(id);

      if (!artist) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "Artist not found",
                code: "NOT_FOUND",
              }),
            },
          ],
          isError: true,
        };
      }

      const artistDetail = await toArtistDetail(artist);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              artist: artistDetail,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("[MCP] get_artist error:", error);

      // Check if it's a validation error (invalid UUID)
      if (error instanceof z.ZodError) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "Invalid artist ID format - must be a valid UUID",
                code: "INVALID_INPUT",
              }),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: "Failed to get artist",
              code: "INTERNAL_ERROR",
            }),
          },
        ],
        isError: true,
      };
    }
  }
);

export { server };
