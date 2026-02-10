// @ts-nocheck

import { jest } from "@jest/globals";

jest.mock("@/lib/auth-helpers", () => ({
  requireAuth: jest.fn(),
}));

jest.mock("@/server/utils/queries/userQueries", () => ({
  getUserById: jest.fn(),
}));

// Polyfill Response.json for test environment
if (!("json" in Response)) {
  Response.json = (data, init) =>
    new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      status: init?.status || 200,
    });
}

describe("GET /api/user/[id]", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  async function setup() {
    const { requireAuth } = await import("@/lib/auth-helpers");
    const { getUserById } = await import("@/server/utils/queries/userQueries");
    const { GET } = await import("../route");

    return {
      GET,
      mockRequireAuth: requireAuth as jest.Mock,
      mockGetUserById: getUserById as jest.Mock,
    };
  }

  function createRequest(id: string) {
    return new Request(`http://localhost/api/user/${id}`);
  }

  function createParams(id: string) {
    return { params: Promise.resolve({ id }) };
  }

  it("returns 401 when not authenticated", async () => {
    const { GET, mockRequireAuth } = await setup();
    mockRequireAuth.mockResolvedValue({
      authenticated: false,
      response: Response.json({ error: "Not authenticated" }, { status: 401 }),
    });

    const response = await GET(createRequest("user-1"), createParams("user-1"));
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("Not authenticated");
  });

  it("returns 403 when requesting another user's data", async () => {
    const { GET, mockRequireAuth } = await setup();
    mockRequireAuth.mockResolvedValue({
      authenticated: true,
      session: { user: { id: "user-1" }, expires: "2025-12-31" },
      userId: "user-1",
    });

    const response = await GET(createRequest("user-2"), createParams("user-2"));
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe("Forbidden");
  });

  it("returns 200 with user data when requesting own data", async () => {
    const { GET, mockRequireAuth, mockGetUserById } = await setup();
    const userData = { id: "user-1", wallet: "0xabc", isAdmin: false };
    mockRequireAuth.mockResolvedValue({
      authenticated: true,
      session: { user: { id: "user-1" }, expires: "2025-12-31" },
      userId: "user-1",
    });
    mockGetUserById.mockResolvedValue(userData);

    const response = await GET(createRequest("user-1"), createParams("user-1"));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.id).toBe("user-1");
    expect(data.wallet).toBe("0xabc");
  });

  it("returns 404 when user not found", async () => {
    const { GET, mockRequireAuth, mockGetUserById } = await setup();
    mockRequireAuth.mockResolvedValue({
      authenticated: true,
      session: { user: { id: "user-1" }, expires: "2025-12-31" },
      userId: "user-1",
    });
    mockGetUserById.mockResolvedValue(null);

    const response = await GET(createRequest("user-1"), createParams("user-1"));
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("User not found");
  });

  it("returns 500 on unexpected error", async () => {
    const { GET, mockRequireAuth, mockGetUserById } = await setup();
    mockRequireAuth.mockResolvedValue({
      authenticated: true,
      session: { user: { id: "user-1" }, expires: "2025-12-31" },
      userId: "user-1",
    });
    mockGetUserById.mockRejectedValue(new Error("DB down"));

    const response = await GET(createRequest("user-1"), createParams("user-1"));
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Internal server error");
  });
});
