// @ts-nocheck
import { jest } from "@jest/globals";

// Mock dependencies
jest.mock("@/server/utils/idMappingService", () => ({
  getUnmappedArtists: jest.fn(),
  resolveArtistMapping: jest.fn().mockResolvedValue({ created: true, updated: false, skipped: false }),
  getMappingStats: jest.fn(),
  getArtistMappings: jest.fn(),
  VALID_MAPPING_PLATFORMS: new Set(["deezer", "apple_music", "musicbrainz", "wikidata", "tidal", "amazon_music", "youtube_music"]),
  VALID_SOURCES: new Set(["wikidata", "musicbrainz", "name_search", "manual"]),
}));
jest.mock("@/server/utils/services", () => ({
  extractArtistId: jest.fn(),
}));
jest.mock("@/server/utils/artistLinkService", () => ({
  setArtistLink: jest.fn().mockResolvedValue({ oldValue: null }),
  clearArtistLink: jest.fn().mockResolvedValue({ oldValue: null }),
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

describe("resolve_artist_id MCP tool", () => {
  beforeEach(() => { jest.resetModules(); });

  async function setup() {
    const { resolveArtistMapping } = await import("@/server/utils/idMappingService");
    const { logMcpAudit } = await import("../audit");
    const { requireMcpAuth, McpAuthError } = await import("../auth");
    const { server } = await import("../server");
    return { resolveArtistMapping, logMcpAudit, requireMcpAuth, McpAuthError, server };
  }

  async function callTool(s, args) {
    const tool = (s.server as any)._registeredTools["resolve_artist_id"];
    return await tool.handler(args, {});
  }

  const validArgs = {
    artistId: "00000000-0000-0000-0000-000000000001",
    platform: "deezer",
    platformId: "12345",
    confidence: "high",
    source: "wikidata",
  };

  it("returns AUTH_REQUIRED when no auth", async () => {
    const s = await setup();
    const { McpAuthError } = s;
    (s.requireMcpAuth as jest.Mock).mockImplementation(() => { throw new McpAuthError("Authentication required"); });

    const result = await callTool(s, validArgs);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.code).toBe("AUTH_REQUIRED");
    expect(result.isError).toBe(true);
  });

  it("returns NOT_FOUND for nonexistent artist", async () => {
    const s = await setup();
    (s.requireMcpAuth as jest.Mock).mockReturnValue("test-hash");
    (s.resolveArtistMapping as jest.Mock).mockRejectedValue(new Error("Artist not found: 00000000-0000-0000-0000-000000000001"));

    const result = await callTool(s, validArgs);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.code).toBe("NOT_FOUND");
    expect(result.isError).toBe(true);
  });

  it("returns INVALID_INPUT for bad platform", async () => {
    const s = await setup();
    (s.requireMcpAuth as jest.Mock).mockReturnValue("test-hash");

    const result = await callTool(s, { ...validArgs, platform: "badplatform" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.code).toBe("INVALID_INPUT");
    expect(result.isError).toBe(true);
  });

  it("returns INVALID_INPUT for bad source", async () => {
    const s = await setup();
    (s.requireMcpAuth as jest.Mock).mockReturnValue("test-hash");
    (s.resolveArtistMapping as jest.Mock).mockRejectedValue(new Error("Invalid source: badsource"));

    const result = await callTool(s, { ...validArgs, source: "badsource" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.code).toBe("INVALID_INPUT");
    expect(result.isError).toBe(true);
  });

  it("returns CONFLICT when platformId belongs to different artist", async () => {
    const s = await setup();
    (s.requireMcpAuth as jest.Mock).mockReturnValue("test-hash");
    (s.resolveArtistMapping as jest.Mock).mockRejectedValue(new Error("Conflict: platformId 12345 on deezer is already mapped to artist other-id"));

    const result = await callTool(s, validArgs);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.code).toBe("CONFLICT");
    expect(result.isError).toBe(true);
  });

  it("creates mapping successfully", async () => {
    const s = await setup();
    (s.requireMcpAuth as jest.Mock).mockReturnValue("test-hash");
    (s.resolveArtistMapping as jest.Mock).mockResolvedValue({ created: true, updated: false, skipped: false });

    const result = await callTool(s, validArgs);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.created).toBe(true);
    expect(result.isError).toBeUndefined();
  });

  it("updates mapping when same/higher confidence", async () => {
    const s = await setup();
    (s.requireMcpAuth as jest.Mock).mockReturnValue("test-hash");
    (s.resolveArtistMapping as jest.Mock).mockResolvedValue({
      created: false, updated: true, skipped: false,
      previousMapping: { platformId: "old-id", confidence: "medium" },
    });

    const result = await callTool(s, validArgs);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.updated).toBe(true);
    expect(parsed.previousMapping.platformId).toBe("old-id");
  });

  it("skips when existing mapping has higher confidence", async () => {
    const s = await setup();
    (s.requireMcpAuth as jest.Mock).mockReturnValue("test-hash");
    (s.resolveArtistMapping as jest.Mock).mockResolvedValue({
      created: false, updated: false, skipped: true,
      previousMapping: { platformId: "existing-id", confidence: "manual" },
    });

    const result = await callTool(s, validArgs);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
    expect(parsed.skipped).toBe(true);
  });

  it("does not write audit log when mapping is skipped", async () => {
    const s = await setup();
    (s.requireMcpAuth as jest.Mock).mockReturnValue("test-hash");
    (s.resolveArtistMapping as jest.Mock).mockResolvedValue({
      created: false, updated: false, skipped: true,
      previousMapping: { platformId: "existing-id", confidence: "manual" },
    });

    await callTool(s, validArgs);
    expect(s.logMcpAudit).not.toHaveBeenCalled();
  });

  it("returns success even when audit log fails", async () => {
    const s = await setup();
    (s.requireMcpAuth as jest.Mock).mockReturnValue("test-hash");
    (s.resolveArtistMapping as jest.Mock).mockResolvedValue({ created: true, updated: false, skipped: false });
    (s.logMcpAudit as jest.Mock).mockRejectedValue(new Error("DB connection failed"));

    const result = await callTool(s, validArgs);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.success).toBe(true);
  });

  it("writes audit log with correct fields", async () => {
    const s = await setup();
    (s.requireMcpAuth as jest.Mock).mockReturnValue("test-hash");
    (s.resolveArtistMapping as jest.Mock).mockResolvedValue({
      created: false, updated: true, skipped: false,
      previousMapping: { platformId: "old-id", confidence: "medium" },
    });

    await callTool(s, validArgs);
    expect(s.logMcpAudit).toHaveBeenCalledWith({
      artistId: validArgs.artistId,
      field: "mapping:deezer",
      action: "resolve",
      oldValue: "old-id",
      newValue: "12345",
      apiKeyHash: "test-hash",
    });
  });
});
