// @ts-nocheck
import { jest } from "@jest/globals";

jest.mock("@/lib/auth-helpers", () => ({ requireAdmin: jest.fn() }));
jest.mock("@/server/utils/queries/artistDataQueries", () => ({
  getArtistDataSummary: jest.fn(),
}));

// Polyfill Response.json
if (!("json" in Response)) {
  Response.json = (data, init) =>
    new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      status: init?.status || 200,
    });
}

describe("GET /api/admin/artist-data", () => {
  beforeEach(() => { jest.resetModules(); });

  async function setup() {
    const { requireAdmin } = await import("@/lib/auth-helpers");
    const { getArtistDataSummary } = await import("@/server/utils/queries/artistDataQueries");
    const { GET } = await import("../route");
    return { GET, requireAdmin, getArtistDataSummary };
  }

  const mockSummary = {
    totalArtists: 41971,
    totalWithSpotify: 38403,
    platformIdCoverage: [{ platform: "deezer", count: 58, percentage: 0.15, todayCount: 11 }],
    artistLinkCoverage: [{ column: "instagram", category: "social", count: 29010, percentage: 69.12, todayCount: 0 }],
    completenessDistribution: [{ bucket: "0-1", count: 3783, percentage: 9.01 }],
    medianFields: 5,
    averageFields: 5.2,
    enrichmentReadiness: { hasWikidata: 41, hasSpotifyNoWikidata: 38362, noSpotify: 3568 },
  };

  it("returns 401 when not authenticated", async () => {
    const { GET, requireAdmin } = await setup();
    (requireAdmin as jest.Mock).mockResolvedValue({
      authenticated: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 403 when authenticated but not admin", async () => {
    const { GET, requireAdmin } = await setup();
    (requireAdmin as jest.Mock).mockResolvedValue({
      authenticated: false,
      response: Response.json({ error: "Forbidden" }, { status: 403 }),
    });

    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns 200 with all sections when authenticated as admin", async () => {
    const { GET, requireAdmin, getArtistDataSummary } = await setup();
    (requireAdmin as jest.Mock).mockResolvedValue({ authenticated: true });
    (getArtistDataSummary as jest.Mock).mockResolvedValue(mockSummary);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("totalArtists", 41971);
    expect(body).toHaveProperty("totalWithSpotify", 38403);
    expect(body).toHaveProperty("platformIdCoverage");
    expect(body).toHaveProperty("artistLinkCoverage");
    expect(body).toHaveProperty("completenessDistribution");
    expect(body).toHaveProperty("medianFields");
    expect(body).toHaveProperty("averageFields");
    expect(body).toHaveProperty("enrichmentReadiness");
    expect(body.enrichmentReadiness.hasWikidata).toBe(41);
  });

  it("returns 500 on query error", async () => {
    const { GET, requireAdmin, getArtistDataSummary } = await setup();
    (requireAdmin as jest.Mock).mockResolvedValue({ authenticated: true });
    (getArtistDataSummary as jest.Mock).mockRejectedValue(new Error("DB down"));

    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Internal server error");
  });

  it("serves cached data on subsequent requests within TTL", async () => {
    const { GET, requireAdmin, getArtistDataSummary } = await setup();
    (requireAdmin as jest.Mock).mockResolvedValue({ authenticated: true });
    (getArtistDataSummary as jest.Mock).mockResolvedValue(mockSummary);

    await GET();
    await GET();
    expect(getArtistDataSummary).toHaveBeenCalledTimes(1);
  });
});
