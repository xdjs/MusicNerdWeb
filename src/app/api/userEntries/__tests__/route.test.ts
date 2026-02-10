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
  count: jest.fn(() => ({ type: "count" })),
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

  // Build a fluent chain mock for the count query (db.select({ value: count() }).from().where())
  function buildCountChain(total: number) {
    const chain: any = {};
    chain.from = jest.fn(() => chain);
    chain.where = jest.fn(() => chain);
    chain.then = (resolve, reject) => Promise.resolve([{ value: total }]).then(resolve, reject);
    return chain;
  }

  // Build a fluent chain mock that supports both `await baseQuery` and `baseQuery.limit(...).offset(...)`
  function buildDataChain(rows: any[]) {
    const chain: any = {};
    chain.from = jest.fn(() => chain);
    chain.leftJoin = jest.fn(() => chain);
    chain.where = jest.fn(() => chain);
    chain.orderBy = jest.fn(() => chain);
    chain.limit = jest.fn(() => chain);
    chain.offset = jest.fn(() => chain);
    chain.then = (resolve, reject) => Promise.resolve(rows).then(resolve, reject);
    return chain;
  }

  // Set up db.select to return count chain first, then data chain
  function setupDbSelect(mockDb: any, rows: any[], total: number) {
    const countChain = buildCountChain(total);
    const dataChain = buildDataChain(rows);
    mockDb.select
      .mockReturnValueOnce(countChain)
      .mockReturnValueOnce(dataChain);
    return dataChain;
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

    // Mock both count and data select queries
    setupDbSelect(mockDb, mockEntries, 2);

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

    setupDbSelect(mockDb, mockEntries, 1);

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

    setupDbSelect(mockDb, mockEntries, 15);

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

    // Make the count query fail by returning a rejecting chain
    const failChain: any = {};
    failChain.from = jest.fn(() => failChain);
    failChain.where = jest.fn(() => failChain);
    failChain.then = (_resolve: any, reject: any) => Promise.reject(new Error("DB error")).then(_resolve, reject);
    mockDb.select.mockReturnValueOnce(failChain);

    const response = await GET(createRequest());
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Internal server error");
  });
});
