// @ts-nocheck
import { jest } from "@jest/globals";

jest.mock("@/app/api/mcp/auth", () => ({ validateMcpApiKey: jest.fn() }));
jest.mock("@/server/utils/queries/heartbeatQueries", () => ({ upsertHeartbeat: jest.fn() }));

if (!("json" in Response)) {
  Response.json = (data, init) =>
    new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      status: init?.status || 200,
    });
}

describe("POST /api/agent/heartbeat", () => {
  beforeEach(() => { jest.resetModules(); });

  async function setup() {
    const { validateMcpApiKey } = await import("@/app/api/mcp/auth");
    const { upsertHeartbeat } = await import("@/server/utils/queries/heartbeatQueries");
    const { POST } = await import("../route");
    return {
      POST,
      mockValidate: validateMcpApiKey as jest.Mock,
      mockUpsert: upsertHeartbeat as jest.Mock,
    };
  }

  function makeRequest(body: Record<string, unknown>, apiKey = "test-key") {
    return new Request("http://localhost/api/agent/heartbeat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  }

  it("returns 401 when API key is invalid", async () => {
    const { POST, mockValidate } = await setup();
    mockValidate.mockResolvedValue(null);

    const res = await POST(makeRequest({ workerId: "w1", status: "running" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/API key/i);
  });

  it("returns 400 when workerId is missing", async () => {
    const { POST, mockValidate } = await setup();
    mockValidate.mockResolvedValue("hash123");

    const res = await POST(makeRequest({ status: "running" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/workerId/);
  });

  it("returns 400 when status is invalid", async () => {
    const { POST, mockValidate } = await setup();
    mockValidate.mockResolvedValue("hash123");

    const res = await POST(makeRequest({ workerId: "w1", status: "bogus" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/status must be one of/);
  });

  it("returns 200 and calls upsertHeartbeat on valid request", async () => {
    const { POST, mockValidate, mockUpsert } = await setup();
    mockValidate.mockResolvedValue("hash123");
    mockUpsert.mockResolvedValue(undefined);

    const res = await POST(makeRequest({
      workerId: "w1",
      status: "running",
      currentRun: 5,
      batchPlatform: "deezer",
      batchSize: 50,
      message: "Run 5 starting",
      config: { batchTimeout: 1200 },
    }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith({
      workerId: "w1",
      apiKeyHash: "hash123",
      status: "running",
      currentRun: 5,
      batchPlatform: "deezer",
      batchSize: 50,
      message: "Run 5 starting",
      config: { batchTimeout: 1200 },
    });
  });

  it("ignores non-matching types for optional fields", async () => {
    const { POST, mockValidate, mockUpsert } = await setup();
    mockValidate.mockResolvedValue("hash123");
    mockUpsert.mockResolvedValue(undefined);

    const res = await POST(makeRequest({
      workerId: "w1",
      status: "idle",
      currentRun: "not-a-number",
      batchSize: "also-not",
      message: 123,
      config: "not-object",
    }));

    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith({
      workerId: "w1",
      apiKeyHash: "hash123",
      status: "idle",
      currentRun: undefined,
      batchPlatform: undefined,
      batchSize: undefined,
      message: undefined,
      config: undefined,
    });
  });

  it("accepts all valid status values", async () => {
    const { POST, mockValidate, mockUpsert } = await setup();
    mockValidate.mockResolvedValue("hash123");
    mockUpsert.mockResolvedValue(undefined);

    for (const status of ["starting", "running", "idle", "error", "stopping"]) {
      const res = await POST(makeRequest({ workerId: "w1", status }));
      expect(res.status).toBe(200);
    }
    expect(mockUpsert).toHaveBeenCalledTimes(5);
  });
});
