import { getAccessToken } from "@privy-io/react-auth";
import { requestInterviewResponses } from "../requestInterviewResponses";
import { responseListSchema } from "../types";
jest.mock("@privy-io/react-auth", () => ({ getAccessToken: jest.fn() }));
jest.mock("@/lib/musicNerdApi/musicNerdApiUrl", () => ({
  musicNerdApiUrl: (path: string) => `https://api.example.org${path}`,
}));
const token = getAccessToken as jest.Mock;
const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
  jest.clearAllMocks();
});
it("requires a real access token before reading responses", async () => {
  token.mockResolvedValue(null);
  global.fetch = jest.fn();
  await expect(
    requestInterviewResponses("artist", "", responseListSchema),
  ).rejects.toThrow("Sign in");
  expect(global.fetch).not.toHaveBeenCalled();
});
it("uses the shared API, disables caching, and rejects errors as errors instead of empty history", async () => {
  token.mockResolvedValue("fixture-token");
  global.fetch = jest
    .fn()
    .mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok", responses: [], nextCursor: null }),
    });
  expect(
    await requestInterviewResponses("artist", "?limit=5", responseListSchema),
  ).toMatchObject({ responses: [] });
  expect(global.fetch).toHaveBeenCalledWith(
    "https://api.example.org/api/artist/artist/interview/responses?limit=5",
    expect.objectContaining({
      cache: "no-store",
      headers: expect.objectContaining({
        Authorization: "Bearer fixture-token",
      }),
    }),
  );
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: false,
    status: 503,
    json: async () => ({ error: "database details" }),
  });
  await expect(
    requestInterviewResponses("artist", "", responseListSchema),
  ).rejects.toThrow("temporarily unavailable");
});
