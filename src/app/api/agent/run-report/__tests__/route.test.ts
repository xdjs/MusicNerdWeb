// @ts-nocheck
import { jest } from "@jest/globals";

jest.mock("@/app/api/mcp/auth", () => ({ validateMcpApiKey: jest.fn() }));
jest.mock("@/server/utils/queries/runQueries", () => ({ upsertRun: jest.fn() }));

if (!("json" in Response)) {
  Response.json = (data, init) =>
    new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      status: init?.status || 200,
    });
}

describe("POST /api/agent/run-report", () => {
  beforeEach(() => { jest.resetModules(); });

  async function setup() {
    const { validateMcpApiKey } = await import("@/app/api/mcp/auth");
    const { upsertRun } = await import("@/server/utils/queries/runQueries");
    const { POST } = await import("../route");
    return {
      POST,
      mockValidate: validateMcpApiKey as jest.Mock,
      mockUpsert: upsertRun as jest.Mock,
    };
  }

  function makeRequest(body: Record<string, unknown>) {
    return new Request("http://localhost/api/agent/run-report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-key",
      },
      body: JSON.stringify(body),
    });
  }

  const validBody = {
    workerId: "w1",
    runNumber: 1,
    status: "running",
    startedAt: "2026-03-25T12:00:00Z",
  };

  it("returns 401 when API key is invalid", async () => {
    const { POST, mockValidate } = await setup();
    mockValidate.mockResolvedValue(null);

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
  });

  it("returns 400 when workerId is missing", async () => {
    const { POST, mockValidate } = await setup();
    mockValidate.mockResolvedValue("hash123");

    const res = await POST(makeRequest({ ...validBody, workerId: undefined }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/workerId/);
  });

  it("returns 400 when runNumber is missing", async () => {
    const { POST, mockValidate } = await setup();
    mockValidate.mockResolvedValue("hash123");

    const res = await POST(makeRequest({ ...validBody, runNumber: undefined }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/runNumber/);
  });

  it("returns 400 when runNumber is a float", async () => {
    const { POST, mockValidate } = await setup();
    mockValidate.mockResolvedValue("hash123");

    const res = await POST(makeRequest({ ...validBody, runNumber: 3.5 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when status is invalid", async () => {
    const { POST, mockValidate } = await setup();
    mockValidate.mockResolvedValue("hash123");

    const res = await POST(makeRequest({ ...validBody, status: "bogus" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/status must be one of/);
  });

  it("returns 400 when startedAt is missing", async () => {
    const { POST, mockValidate } = await setup();
    mockValidate.mockResolvedValue("hash123");

    const res = await POST(makeRequest({ ...validBody, startedAt: undefined }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/startedAt/);
  });

  it("returns 200 on valid request with all fields", async () => {
    const { POST, mockValidate, mockUpsert } = await setup();
    mockValidate.mockResolvedValue("hash123");
    mockUpsert.mockResolvedValue(undefined);

    const res = await POST(makeRequest({
      ...validBody,
      status: "success",
      endedAt: "2026-03-25T12:05:00Z",
      wallTimeSecs: 300,
      claudeTimeSecs: 280,
      apiTimeSecs: 290,
      turns: 25,
      batchSize: 50,
      resolved: 10,
      excluded: 2,
      skipped: 3,
      errors: 0,
      highConfidence: 8,
      mediumConfidence: 2,
      conflicts: 0,
      nameMismatches: 1,
      tooAmbiguous: 1,
      exitCode: 0,
      failCategory: null,
      failReason: null,
    }));

    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
      workerId: "w1",
      apiKeyHash: "hash123",
      runNumber: 1,
      status: "success",
      resolved: 10,
      excluded: 2,
      highConfidence: 8,
      wallTimeSecs: 300,
      turns: 25,
    }));
  });

  it("returns 200 with minimal required fields", async () => {
    const { POST, mockValidate, mockUpsert } = await setup();
    mockValidate.mockResolvedValue("hash123");
    mockUpsert.mockResolvedValue(undefined);

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
      workerId: "w1",
      runNumber: 1,
      status: "running",
      startedAt: "2026-03-25T12:00:00Z",
    }));
  });

  it("accepts all valid status values", async () => {
    const { POST, mockValidate, mockUpsert } = await setup();
    mockValidate.mockResolvedValue("hash123");
    mockUpsert.mockResolvedValue(undefined);

    for (const status of ["running", "success", "failed"]) {
      const res = await POST(makeRequest({ ...validBody, status }));
      expect(res.status).toBe(200);
    }
    expect(mockUpsert).toHaveBeenCalledTimes(3);
  });
});
