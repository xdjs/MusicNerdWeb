// @ts-nocheck

import { jest } from "@jest/globals";

jest.mock("@/lib/auth-helpers", () => ({
  requireAuth: jest.fn(),
}));

jest.mock("@/server/utils/queries/userQueries", () => ({
  getUserById: jest.fn(),
  updateUsername: jest.fn(),
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

describe("PATCH /api/user/[id]", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  async function setup() {
    const { requireAuth } = await import("@/lib/auth-helpers");
    const { updateUsername } = await import("@/server/utils/queries/userQueries");
    const { PATCH } = await import("../route");

    return {
      PATCH,
      mockRequireAuth: requireAuth as jest.Mock,
      mockUpdateUsername: updateUsername as jest.Mock,
    };
  }

  function createRequest(id: string, body: Record<string, unknown>) {
    return new Request(`http://localhost/api/user/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  function createParams(id: string) {
    return { params: Promise.resolve({ id }) };
  }

  const authedAs = (id: string) => ({
    authenticated: true,
    session: { user: { id }, expires: "2025-12-31" },
    userId: id,
  });

  it("returns 401 when not authenticated", async () => {
    const { PATCH, mockRequireAuth } = await setup();
    mockRequireAuth.mockResolvedValue({
      authenticated: false,
      response: Response.json({ error: "Not authenticated" }, { status: 401 }),
    });

    const response = await PATCH(
      createRequest("user-1", { username: "newname" }),
      createParams("user-1")
    );
    expect(response.status).toBe(401);
  });

  it("returns 403 when updating another user's username", async () => {
    const { PATCH, mockRequireAuth } = await setup();
    mockRequireAuth.mockResolvedValue(authedAs("user-1"));

    const response = await PATCH(
      createRequest("user-2", { username: "newname" }),
      createParams("user-2")
    );
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe("Forbidden");
  });

  it("returns 400 when username is missing", async () => {
    const { PATCH, mockRequireAuth } = await setup();
    mockRequireAuth.mockResolvedValue(authedAs("user-1"));

    const response = await PATCH(
      createRequest("user-1", {}),
      createParams("user-1")
    );
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.status).toBe("error");
    expect(data.message).toBe("Username is required");
  });

  it("returns 400 when username is empty string", async () => {
    const { PATCH, mockRequireAuth } = await setup();
    mockRequireAuth.mockResolvedValue(authedAs("user-1"));

    const response = await PATCH(
      createRequest("user-1", { username: "   " }),
      createParams("user-1")
    );
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.status).toBe("error");
  });

  it("returns success when username is valid", async () => {
    const { PATCH, mockRequireAuth, mockUpdateUsername } = await setup();
    mockRequireAuth.mockResolvedValue(authedAs("user-1"));
    mockUpdateUsername.mockResolvedValue({ status: "success", message: "Username updated" });

    const response = await PATCH(
      createRequest("user-1", { username: "newname" }),
      createParams("user-1")
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe("success");
    expect(mockUpdateUsername).toHaveBeenCalledWith("user-1", "newname");
  });

  it("trims whitespace from username", async () => {
    const { PATCH, mockRequireAuth, mockUpdateUsername } = await setup();
    mockRequireAuth.mockResolvedValue(authedAs("user-1"));
    mockUpdateUsername.mockResolvedValue({ status: "success", message: "Username updated" });

    await PATCH(
      createRequest("user-1", { username: "  padded  " }),
      createParams("user-1")
    );
    expect(mockUpdateUsername).toHaveBeenCalledWith("user-1", "padded");
  });

  it("returns 400 when updateUsername reports an error", async () => {
    const { PATCH, mockRequireAuth, mockUpdateUsername } = await setup();
    mockRequireAuth.mockResolvedValue(authedAs("user-1"));
    mockUpdateUsername.mockResolvedValue({ status: "error", message: "Error updating username" });

    const response = await PATCH(
      createRequest("user-1", { username: "newname" }),
      createParams("user-1")
    );
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.status).toBe("error");
  });

  it("returns 500 on unexpected error", async () => {
    const { PATCH, mockRequireAuth, mockUpdateUsername } = await setup();
    mockRequireAuth.mockResolvedValue(authedAs("user-1"));
    mockUpdateUsername.mockRejectedValue(new Error("DB down"));

    const response = await PATCH(
      createRequest("user-1", { username: "newname" }),
      createParams("user-1")
    );
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.status).toBe("error");
  });
});
