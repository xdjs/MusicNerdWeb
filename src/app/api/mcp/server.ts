import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { searchForArtistByName, getArtistById } from "@/server/utils/queries/artistQueries";
import { toArtistSummary } from "./transformers/artist-summary";
import { toArtistDetail } from "./transformers/artist-detail";
import { extractArtistId } from "@/server/utils/services";
import { setArtistLink, clearArtistLink } from "@/server/utils/artistLinkService";
import { requireMcpAuth, McpAuthError } from "./auth";
import { logMcpAudit } from "./audit";
import { db } from "@/server/db/drizzle";
import { artists, urlmap } from "@/server/db/schema";
import { eq } from "drizzle-orm";

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

// CONVENTION: All mutating tools MUST call requireMcpAuth() as their first
// operation before any DB work. Read-only tools do not require auth.

// Register the set_artist_link tool
server.registerTool(
  "set_artist_link",
  {
    title: "Set Artist Link",
    description: "Set a platform link on an artist record. The platform is automatically inferred from the URL.",
    inputSchema: {
      artistId: z.string().uuid().describe("The UUID of the artist in MusicNerd"),
      url: z.string().url().describe("The platform URL to set (e.g. https://instagram.com/username)"),
    },
  },
  async ({ artistId, url }) => {
    console.log(`[MCP] set_artist_link called with artistId="${artistId}", url="${url}"`);

    try {
      const apiKeyHash = requireMcpAuth();

      // Validate artist exists
      const artist = await db.query.artists.findFirst({
        where: eq(artists.id, artistId),
      });
      if (!artist) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "Artist not found", code: "NOT_FOUND" }) }],
          isError: true,
        };
      }

      // Extract platform and ID from URL
      const extracted = await extractArtistId(url);
      if (!extracted || !extracted.id) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "URL does not match any approved platform", code: "INVALID_URL" }) }],
          isError: true,
        };
      }

      const { siteName, id: extractedId } = extracted;

      // Read current value for audit log
      const oldValue = (artist as Record<string, unknown>)[siteName] as string | null ?? null;

      // Set the link
      await setArtistLink(artistId, siteName, extractedId);

      // Write audit log
      await logMcpAudit({
        artistId,
        field: siteName,
        action: "set",
        submittedUrl: url,
        oldValue,
        newValue: extractedId,
        apiKeyHash,
      });

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            siteName,
            extractedId,
            oldValue,
          }, null, 2),
        }],
      };
    } catch (error) {
      if (error instanceof McpAuthError) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: error.message, code: "AUTH_REQUIRED" }) }],
          isError: true,
        };
      }
      console.error("[MCP] set_artist_link error:", error);
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "Failed to set artist link", code: "INTERNAL_ERROR" }) }],
        isError: true,
      };
    }
  }
);

// Register the delete_artist_link tool
server.registerTool(
  "delete_artist_link",
  {
    title: "Delete Artist Link",
    description: "Remove a platform link from an artist record",
    inputSchema: {
      artistId: z.string().uuid().describe("The UUID of the artist in MusicNerd"),
      siteName: z.string().describe("The platform name (e.g. instagram, x, spotify, youtube)"),
    },
  },
  async ({ artistId, siteName }) => {
    console.log(`[MCP] delete_artist_link called with artistId="${artistId}", siteName="${siteName}"`);

    try {
      const apiKeyHash = requireMcpAuth();

      // Validate artist exists
      const artist = await db.query.artists.findFirst({
        where: eq(artists.id, artistId),
      });
      if (!artist) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "Artist not found", code: "NOT_FOUND" }) }],
          isError: true,
        };
      }

      // Validate siteName exists in urlmap
      const platform = await db.query.urlmap.findFirst({
        where: eq(urlmap.siteName, siteName),
      });
      if (!platform) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "Invalid platform name", code: "INVALID_PLATFORM" }) }],
          isError: true,
        };
      }

      // Check current value
      const oldValue = (artist as Record<string, unknown>)[siteName] as string | null ?? null;
      if (oldValue === null) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "Link is not set", code: "NOT_SET" }) }],
          isError: true,
        };
      }

      // Clear the link
      await clearArtistLink(artistId, siteName);

      // Write audit log
      await logMcpAudit({
        artistId,
        field: siteName,
        action: "delete",
        oldValue,
        apiKeyHash,
      });

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            siteName,
            oldValue,
          }, null, 2),
        }],
      };
    } catch (error) {
      if (error instanceof McpAuthError) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: error.message, code: "AUTH_REQUIRED" }) }],
          isError: true,
        };
      }
      console.error("[MCP] delete_artist_link error:", error);
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "Failed to delete artist link", code: "INTERNAL_ERROR" }) }],
        isError: true,
      };
    }
  }
);

export { server };
