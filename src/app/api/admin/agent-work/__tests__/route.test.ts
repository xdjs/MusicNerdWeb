// @ts-nocheck
import { jest } from "@jest/globals";

jest.mock("@/lib/auth-helpers", () => ({ requireAdmin: jest.fn() }));
jest.mock("@/server/utils/queries/agentWorkQueries", () => ({
  getAgentWorkData: jest.fn(),
}));

// Polyfill Response.json
if (!("json" in Response)) {
  Response.json = (data, init) =>
    new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      status: init?.status || 200,
    });
}

describe("GET /api/admin/agent-work", () => {
  beforeEach(() => { jest.resetModules(); });

  async function setup() {
    const { requireAdmin } = await import("@/lib/auth-helpers");
    const { getAgentWorkData } = await import("@/server/utils/queries/agentWorkQueries");
    const { GET } = await import("../route");
    return { GET, requireAdmin, getAgentWorkData };
  }

  function makeRequest(params = "") {
    return new Request(`http://localhost:3000/api/admin/agent-work${params}`);
  }

  const mockData = {
    stats: { totalArtistsWithSpotify: 1000, platformStats: [] },
    auditLog: { entries: [], total: 0, page: 1, limit: 50 },
    agentBreakdown: { agents: [] },
    exclusions: { platforms: {} },
  };

  it("returns 401 when not authenticated", async () => {
    const { GET, requireAdmin } = await setup();
    (requireAdmin as jest.Mock).mockResolvedValue({
      authenticated: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    const { GET, requireAdmin } = await setup();
    (requireAdmin as jest.Mock).mockResolvedValue({
      authenticated: false,
      response: Response.json({ error: "Forbidden" }, { status: 403 }),
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });

  it("returns all four data sections on success", async () => {
    const { GET, requireAdmin, getAgentWorkData } = await setup();
    (requireAdmin as jest.Mock).mockResolvedValue({ authenticated: true });
    (getAgentWorkData as jest.Mock).mockResolvedValue(mockData);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("stats");
    expect(body).toHaveProperty("auditLog");
    expect(body).toHaveProperty("agentBreakdown");
    expect(body).toHaveProperty("exclusions");
  });

  it("passes pagination params to query", async () => {
    const { GET, requireAdmin, getAgentWorkData } = await setup();
    (requireAdmin as jest.Mock).mockResolvedValue({ authenticated: true });
    (getAgentWorkData as jest.Mock).mockResolvedValue(mockData);

    await GET(makeRequest("?auditPage=2&auditLimit=25"));
    expect(getAgentWorkData).toHaveBeenCalledWith(2, 25);
  });

  it("defaults pagination when no params", async () => {
    const { GET, requireAdmin, getAgentWorkData } = await setup();
    (requireAdmin as jest.Mock).mockResolvedValue({ authenticated: true });
    (getAgentWorkData as jest.Mock).mockResolvedValue(mockData);

    await GET(makeRequest());
    expect(getAgentWorkData).toHaveBeenCalledWith(1, 50);
  });

  it("returns 500 on query error", async () => {
    const { GET, requireAdmin, getAgentWorkData } = await setup();
    (requireAdmin as jest.Mock).mockResolvedValue({ authenticated: true });
    (getAgentWorkData as jest.Mock).mockRejectedValue(new Error("DB down"));

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Internal server error");
  });
});
