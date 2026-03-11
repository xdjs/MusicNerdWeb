// @ts-nocheck
import { jest } from "@jest/globals";

// Mock dependencies
jest.mock("@/server/utils/services", () => ({
  extractArtistId: jest.fn(),
}));
jest.mock("@/server/utils/artistLinkService", () => ({
  setArtistLink: jest.fn().mockResolvedValue(undefined),
  clearArtistLink: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../audit", () => ({
  logMcpAudit: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../auth", () => ({
  requireMcpAuth: jest.fn(),
  McpAuthError: class McpAuthError extends Error {
    constructor(msg) { super(msg); this.name = "McpAuthError"; }
  },
}));

describe("set_artist_link MCP tool", () => {
  beforeEach(() => { jest.resetModules(); });

  async function setup() {
    const { db } = await import("@/server/db/drizzle");
    (db as any).query.artists = { findFirst: jest.fn() };
    if (!(db as any).query.urlmap) {
      (db as any).query.urlmap = { findFirst: jest.fn(), findMany: jest.fn() };
    }

    const { extractArtistId } = await import("@/server/utils/services");
    const { setArtistLink } = await import("@/server/utils/artistLinkService");
    const { logMcpAudit } = await import("../audit");
    const { requireMcpAuth, McpAuthError } = await import("../auth");

    // Import server to get the registered tools
    const { server } = await import("../server");

    return { db, extractArtistId, setArtistLink, logMcpAudit, requireMcpAuth, McpAuthError, server };
  }

  // Helper to call the set_artist_link tool handler directly via _registeredTools
  async function callSetArtistLink(setup_result: any, args: { artistId: string; url: string }) {
    const { server } = setup_result;
    const tool = (server as any)._registeredTools["set_artist_link"];
    return await tool.handler(args, {});
  }

  it("returns error when artist ID does not exist", async () => {
    const s = await setup();
    (s.requireMcpAuth as jest.Mock).mockReturnValue("test-hash");
    (s.db as any).query.artists.findFirst.mockResolvedValue(null);

    const result = await callSetArtistLink(s, { artistId: "00000000-0000-0000-0000-000000000000", url: "https://instagram.com/test" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("Artist not found");
    expect(result.isError).toBe(true);
  });

  it("returns error when URL does not match any platform", async () => {
    const s = await setup();
    (s.requireMcpAuth as jest.Mock).mockReturnValue("test-hash");
    (s.db as any).query.artists.findFirst.mockResolvedValue({ id: "artist-1", instagram: null });
    (s.extractArtistId as jest.Mock).mockResolvedValue(null);

    const result = await callSetArtistLink(s, { artistId: "00000000-0000-0000-0000-000000000001", url: "https://unknown.com/test" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("URL does not match any approved platform");
  });

  it("returns error when extractArtistId returns object with empty id", async () => {
    const s = await setup();
    (s.requireMcpAuth as jest.Mock).mockReturnValue("test-hash");
    (s.db as any).query.artists.findFirst.mockResolvedValue({ id: "artist-1" });
    (s.extractArtistId as jest.Mock).mockResolvedValue({ siteName: "instagram", id: "" });

    const result = await callSetArtistLink(s, { artistId: "00000000-0000-0000-0000-000000000001", url: "https://instagram.com/" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("URL does not match any approved platform");
  });

  it("sets instagram link for artist", async () => {
    const s = await setup();
    (s.requireMcpAuth as jest.Mock).mockReturnValue("test-hash");
    (s.db as any).query.artists.findFirst.mockResolvedValue({ id: "artist-1", instagram: null });
    (s.extractArtistId as jest.Mock).mockResolvedValue({ siteName: "instagram", id: "testuser", cardPlatformName: "Instagram" });

    const result = await callSetArtistLink(s, { artistId: "00000000-0000-0000-0000-000000000001", url: "https://instagram.com/testuser" });
    expect(s.setArtistLink).toHaveBeenCalledWith("00000000-0000-0000-0000-000000000001", "instagram", "testuser");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.siteName).toBe("instagram");
  });

  it("returns old value when overwriting existing link", async () => {
    const s = await setup();
    (s.requireMcpAuth as jest.Mock).mockReturnValue("test-hash");
    (s.db as any).query.artists.findFirst.mockResolvedValue({ id: "artist-1", instagram: "old-user" });
    (s.extractArtistId as jest.Mock).mockResolvedValue({ siteName: "instagram", id: "new-user", cardPlatformName: "Instagram" });

    const result = await callSetArtistLink(s, { artistId: "00000000-0000-0000-0000-000000000001", url: "https://instagram.com/new-user" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.oldValue).toBe("old-user");
  });

  it("writes audit log entry with correct fields", async () => {
    const s = await setup();
    (s.requireMcpAuth as jest.Mock).mockReturnValue("test-hash");
    (s.db as any).query.artists.findFirst.mockResolvedValue({ id: "artist-1", instagram: "old-user" });
    (s.extractArtistId as jest.Mock).mockResolvedValue({ siteName: "instagram", id: "new-user", cardPlatformName: "Instagram" });

    await callSetArtistLink(s, { artistId: "00000000-0000-0000-0000-000000000001", url: "https://instagram.com/new-user" });
    expect(s.logMcpAudit).toHaveBeenCalledWith({
      artistId: "00000000-0000-0000-0000-000000000001",
      field: "instagram",
      action: "set",
      submittedUrl: "https://instagram.com/new-user",
      oldValue: "old-user",
      newValue: "new-user",
      apiKeyHash: "test-hash",
    });
  });

  it("returns error when no auth context", async () => {
    const s = await setup();
    const { McpAuthError } = s;
    (s.requireMcpAuth as jest.Mock).mockImplementation(() => { throw new McpAuthError("Authentication required"); });

    const result = await callSetArtistLink(s, { artistId: "00000000-0000-0000-0000-000000000001", url: "https://instagram.com/test" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("Authentication required");
    expect(parsed.code).toBe("AUTH_REQUIRED");
  });
});
