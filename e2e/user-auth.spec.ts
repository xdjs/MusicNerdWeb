import { test, expect } from "@playwright/test";

test.describe("User route auth checks", () => {
  test.skip("Authenticated user can fetch own profile", async ({ request }) => {
    // TODO: Set up authenticated session cookie
    const response = await request.get("/api/user/test-user-id");
    expect(response.status()).toBe(200);
  });

  test.skip("Authenticated user can fetch their entries", async ({ request }) => {
    // TODO: Set up authenticated session cookie
    const response = await request.get("/api/userEntries");
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("entries");
  });

  test.skip("Authenticated user can fetch recent edits", async ({ request }) => {
    // TODO: Set up authenticated session cookie
    const response = await request.get("/api/recentEdited");
    expect(response.status()).toBe(200);
  });

  test.skip("Unauthenticated request gets empty/401 on protected user routes", async ({
    request,
  }) => {
    // /api/user/[id] should return 401
    const userResponse = await request.get("/api/user/some-id");
    expect(userResponse.status()).toBe(401);

    // /api/userEntries should return empty
    const entriesResponse = await request.get("/api/userEntries");
    expect(entriesResponse.status()).toBe(200);
    const entriesData = await entriesResponse.json();
    expect(entriesData).toEqual({ entries: [], total: 0, pageCount: 0 });

    // /api/recentEdited should return empty
    const recentResponse = await request.get("/api/recentEdited");
    expect(recentResponse.status()).toBe(200);
    const recentData = await recentResponse.json();
    expect(recentData).toEqual([]);
  });
});
