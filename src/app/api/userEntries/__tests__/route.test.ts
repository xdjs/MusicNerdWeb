// @ts-nocheck

import { jest } from "@jest/globals";

jest.mock("@/server/auth", () => ({
  getServerAuthSession: jest.fn(),
}));

jest.mock("@/server/db/drizzle", () => ({
  db: {
    query: {
      ugcresearch: {
        findMany: jest.fn(),
      },
    },
    select: jest.fn(),
  },
}));

jest.mock("@/server/db/schema", () => ({
  ugcresearch: {
    id: "ugcresearch.id",
    createdAt: "ugcresearch.createdAt",
    siteName: "ugcresearch.siteName",
    ugcUrl: "ugcresearch.ugcUrl",
    accepted: "ugcresearch.accepted",
    userId: "ugcresearch.userId",
    artistId: "ugcresearch.artistId",
  },
  artists: {
    id: "artists.id",
    name: "artists.name",
  },
}));

jest.mock("drizzle-orm", () => ({
  eq: jest.fn((...args) => ({ type: "eq", args })),
  and: jest.fn((...args) => ({ type: "and", args })),
  desc: jest.fn((col) => ({ type: "desc", col })),
}));

// Polyfill Response.json for test environment
if (!("json" in Response)) {
  Response.json = (data, init) =>
    new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      status: init?.status || 200,
    });
}

describe("GET /api/userEntries", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  async function setup() {
    const { getServerAuthSession } = await import("@/server/auth");
    const { db } = await import("@/server/db/drizzle");
    const { GET } = await import("../route");

    return {
      GET,
      mockGetSession: getServerAuthSession as jest.Mock,
      mockDb: db as any,
    };
  }

  function createRequest(params: Record<string, string> = {}) {
    const url = new URL("http://localhost/api/userEntries");
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return new Request(url.toString());
  }

  // Build a fluent chain mock that supports both `await baseQuery` and `baseQuery.limit(...).offset(...)`
  function setupDbSelect(mockDb: any, rows: any[]) {
    const chain: any = {};

    // Each method returns the chain object for fluent chaining
    chain.from = jest.fn(() => chain);
    chain.leftJoin = jest.fn(() => chain);
    chain.where = jest.fn(() => chain);
    chain.orderBy = jest.fn(() => chain);
    chain.limit = jest.fn(() => chain);
    chain.offset = jest.fn(() => chain);

    // Make chain thenable so `await chain` resolves to rows
    chain.then = (resolve, reject) => Promise.resolve(rows).then(resolve, reject);

    mockDb.select.mockReturnValue(chain);
    return chain;
  }

  it("returns empty result when not authenticated", async () => {
    const { GET, mockGetSession } = await setup();
    mockGetSession.mockResolvedValue(null);

    const response = await GET(createRequest());
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ entries: [], total: 0, pageCount: 0 });
  });

  it("returns paginated entries for authenticated user", async () => {
    const { GET, mockGetSession, mockDb } = await setup();
    mockGetSession.mockResolvedValue({
      user: { id: "user-1" },
      expires: "2025-12-31",
    });

    const mockEntries = [
      { id: "e1", createdAt: "2025-01-01", siteName: "spotify", ugcUrl: "http://x", accepted: true, artistName: "Artist1" },
    ];

    // Mock the count query
    mockDb.query.ugcresearch.findMany.mockResolvedValue([{ id: "e1" }, { id: "e2" }]);

    // Mock the select query chain
    setupDbSelect(mockDb, mockEntries);

    const response = await GET(createRequest({ page: "1" }));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.entries).toEqual(mockEntries);
    expect(data.total).toBe(2);
    expect(data.pageCount).toBe(1);
  });

  it("filters by siteName when provided", async () => {
    const { GET, mockGetSession, mockDb } = await setup();
    mockGetSession.mockResolvedValue({
      user: { id: "user-1" },
      expires: "2025-12-31",
    });

    const mockEntries = [
      { id: "e1", createdAt: "2025-01-01", siteName: "instagram", ugcUrl: "http://x", accepted: true, artistName: "Artist1" },
    ];

    mockDb.query.ugcresearch.findMany.mockResolvedValue([{ id: "e1" }]);
    setupDbSelect(mockDb, mockEntries);

    const response = await GET(createRequest({ siteName: "instagram" }));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.entries).toEqual(mockEntries);
    // With a siteName filter, noPaginate = true, so pageCount = 1
    expect(data.pageCount).toBe(1);
  });

  it("returns all entries when all=true", async () => {
    const { GET, mockGetSession, mockDb } = await setup();
    mockGetSession.mockResolvedValue({
      user: { id: "user-1" },
      expires: "2025-12-31",
    });

    const mockEntries = Array.from({ length: 15 }, (_, i) => ({
      id: `e${i}`,
      createdAt: "2025-01-01",
      siteName: "spotify",
      ugcUrl: "http://x",
      accepted: true,
      artistName: `Artist${i}`,
    }));

    mockDb.query.ugcresearch.findMany.mockResolvedValue(mockEntries);
    setupDbSelect(mockDb, mockEntries);

    const response = await GET(createRequest({ all: "true" }));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.entries).toEqual(mockEntries);
    // With all=true, noPaginate = true, so pageCount = 1
    expect(data.pageCount).toBe(1);
  });

  it("returns 500 on error", async () => {
    const { GET, mockGetSession, mockDb } = await setup();
    mockGetSession.mockResolvedValue({
      user: { id: "user-1" },
      expires: "2025-12-31",
    });

    mockDb.query.ugcresearch.findMany.mockRejectedValue(new Error("DB error"));

    const response = await GET(createRequest());
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Internal server error");
  });
});
