// @ts-nocheck
import { jest } from "@jest/globals";

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
jest.mock("@/server/utils/services", () => ({
  extractArtistId: jest.fn(),
}));

describe("delete_artist_link MCP tool", () => {
  beforeEach(() => { jest.resetModules(); });

  async function setup() {
    const { db } = await import("@/server/db/drizzle");
    (db as any).query.artists = { findFirst: jest.fn() };
    if (!(db as any).query.urlmap) {
      (db as any).query.urlmap = { findFirst: jest.fn(), findMany: jest.fn() };
    }

    const { clearArtistLink } = await import("@/server/utils/artistLinkService");
    const { logMcpAudit } = await import("../audit");
    const { requireMcpAuth, McpAuthError } = await import("../auth");
    const { server } = await import("../server");

    return { db, clearArtistLink, logMcpAudit, requireMcpAuth, McpAuthError, server };
  }

  async function callDeleteArtistLink(setup_result: any, args: { artistId: string; siteName: string }) {
    const { server } = setup_result;
    const tool = (server as any)._registeredTools["delete_artist_link"];
    return await tool.handler(args, {});
  }

  it("returns error when artist does not exist", async () => {
    const s = await setup();
    (s.requireMcpAuth as jest.Mock).mockReturnValue("test-hash");
    (s.db as any).query.artists.findFirst.mockResolvedValue(null);

    const result = await callDeleteArtistLink(s, { artistId: "00000000-0000-0000-0000-000000000000", siteName: "instagram" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("Artist not found");
  });

  it("returns error when siteName is not in urlmap", async () => {
    const s = await setup();
    (s.requireMcpAuth as jest.Mock).mockReturnValue("test-hash");
    (s.db as any).query.artists.findFirst.mockResolvedValue({ id: "artist-1" });
    (s.db as any).query.urlmap.findFirst.mockResolvedValue(null);

    const result = await callDeleteArtistLink(s, { artistId: "00000000-0000-0000-0000-000000000001", siteName: "fakePlatform" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("Invalid platform name");
  });

  it("returns error when link is already null", async () => {
    const s = await setup();
    (s.requireMcpAuth as jest.Mock).mockReturnValue("test-hash");
    (s.db as any).query.artists.findFirst.mockResolvedValue({ id: "artist-1", x: null });
    (s.db as any).query.urlmap.findFirst.mockResolvedValue({ siteName: "x" });

    const result = await callDeleteArtistLink(s, { artistId: "00000000-0000-0000-0000-000000000001", siteName: "x" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("Link is not set");
  });

  it("deletes x link and calls clearArtistLink", async () => {
    const s = await setup();
    (s.requireMcpAuth as jest.Mock).mockReturnValue("test-hash");
    (s.db as any).query.artists.findFirst.mockResolvedValue({ id: "artist-1", x: "old-handle" });
    (s.db as any).query.urlmap.findFirst.mockResolvedValue({ siteName: "x" });

    const result = await callDeleteArtistLink(s, { artistId: "00000000-0000-0000-0000-000000000001", siteName: "x" });
    expect(s.clearArtistLink).toHaveBeenCalledWith("00000000-0000-0000-0000-000000000001", "x");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
  });

  it("returns old value in response", async () => {
    const s = await setup();
    (s.requireMcpAuth as jest.Mock).mockReturnValue("test-hash");
    (s.db as any).query.artists.findFirst.mockResolvedValue({ id: "artist-1", x: "old-handle" });
    (s.db as any).query.urlmap.findFirst.mockResolvedValue({ siteName: "x" });

    const result = await callDeleteArtistLink(s, { artistId: "00000000-0000-0000-0000-000000000001", siteName: "x" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.oldValue).toBe("old-handle");
  });

  it("writes audit log entry", async () => {
    const s = await setup();
    (s.requireMcpAuth as jest.Mock).mockReturnValue("test-hash");
    (s.db as any).query.artists.findFirst.mockResolvedValue({ id: "artist-1", x: "old-handle" });
    (s.db as any).query.urlmap.findFirst.mockResolvedValue({ siteName: "x" });

    await callDeleteArtistLink(s, { artistId: "00000000-0000-0000-0000-000000000001", siteName: "x" });
    expect(s.logMcpAudit).toHaveBeenCalledWith({
      artistId: "00000000-0000-0000-0000-000000000001",
      field: "x",
      action: "delete",
      oldValue: "old-handle",
      apiKeyHash: "test-hash",
    });
  });

  it("returns error when no auth context", async () => {
    const s = await setup();
    const { McpAuthError } = s;
    (s.requireMcpAuth as jest.Mock).mockImplementation(() => { throw new McpAuthError("Authentication required"); });

    const result = await callDeleteArtistLink(s, { artistId: "00000000-0000-0000-0000-000000000001", siteName: "x" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toBe("Authentication required");
    expect(parsed.code).toBe("AUTH_REQUIRED");
  });
});
