// @ts-nocheck
import { jest } from "@jest/globals";

jest.mock("@/lib/auth-helpers", () => ({ requireAdmin: jest.fn() }));
jest.mock("@/server/utils/queries/agentWorkQueries", () => ({
  getAgentWorkSummary: jest.fn(),
  getAgentWorkDetails: jest.fn(),
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
    const { getAgentWorkSummary, getAgentWorkDetails } = await import("@/server/utils/queries/agentWorkQueries");
    const { GET } = await import("../route");
    return { GET, requireAdmin, getAgentWorkSummary, getAgentWorkDetails };
  }

  function makeRequest(params = "") {
    return new Request(`http://localhost:3000/api/admin/agent-work${params}`);
  }

  const mockSummary = {
    stats: { totalArtistsWithSpotify: 1000, platformStats: [] },
    activityPulse: { lastWriteAt: null, rateLastHour: 0 },
    hourlyActivity: [],
    workers: [],
  };

  const mockDetails = {
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

  it("returns summary by default", async () => {
    const { GET, requireAdmin, getAgentWorkSummary } = await setup();
    (requireAdmin as jest.Mock).mockResolvedValue({ authenticated: true });
    (getAgentWorkSummary as jest.Mock).mockResolvedValue(mockSummary);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("stats");
    expect(body).toHaveProperty("activityPulse");
    expect(body).toHaveProperty("workers");
    expect(body).not.toHaveProperty("auditLog");
  });

  it("returns details when sections=details", async () => {
    const { GET, requireAdmin, getAgentWorkDetails } = await setup();
    (requireAdmin as jest.Mock).mockResolvedValue({ authenticated: true });
    (getAgentWorkDetails as jest.Mock).mockResolvedValue(mockDetails);

    const res = await GET(makeRequest("?sections=details"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("auditLog");
    expect(body).toHaveProperty("agentBreakdown");
    expect(body).toHaveProperty("exclusions");
    expect(body).not.toHaveProperty("stats");
  });

  it("passes pagination params to details query", async () => {
    const { GET, requireAdmin, getAgentWorkDetails } = await setup();
    (requireAdmin as jest.Mock).mockResolvedValue({ authenticated: true });
    (getAgentWorkDetails as jest.Mock).mockResolvedValue(mockDetails);

    await GET(makeRequest("?sections=details&auditPage=2&auditLimit=25"));
    expect(getAgentWorkDetails).toHaveBeenCalledWith(2, 25);
  });

  it("returns 500 on query error", async () => {
    const { GET, requireAdmin, getAgentWorkSummary } = await setup();
    (requireAdmin as jest.Mock).mockResolvedValue({ authenticated: true });
    (getAgentWorkSummary as jest.Mock).mockRejectedValue(new Error("DB down"));

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Internal server error");
  });
});
