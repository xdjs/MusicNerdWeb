// @ts-nocheck
const execute = jest.fn();
jest.mock("../../queries/ownershipWrites", () => ({ withScopedArtistWrite: async (_a, fn) => fn({ execute }) }));
jest.mock("../findLatestRefreshId", () => ({ findLatestRefreshId: jest.fn(async () => null) }));
import { draftLatestRefresh } from "../draftLatestRefresh";
import { findLatestRefreshId } from "../findLatestRefreshId";

const context = { userId: "u1", expectedClaimId: "c1" };
beforeEach(() => { execute.mockReset().mockResolvedValue([]); findLatestRefreshId.mockResolvedValue(null); });

it("returns the live or cooling-down request instead of a new one", async () => {
  findLatestRefreshId.mockResolvedValueOnce("job-0");
  expect(await draftLatestRefresh("a1", context)).toBe("job-0");
});

it("drafts the request from the artist's current connections", async () => {
  execute.mockResolvedValueOnce([]).mockResolvedValueOnce([{ instagram: "ig", inprocess: null, spotify: "sp", deezer: null }]);
  expect(await draftLatestRefresh("a1", context)).toEqual({
    claimId: "c1", userId: "u1", instagram: "ig", inprocess: "", spotify: "sp", deezer: "",
    sources: {
      instagram: { status: "pending" }, inprocess: { status: "disconnected" },
      spotify: { status: "pending" }, deezer: { status: "disconnected" }, interviews: { status: "pending" },
    },
  });
});

it("fails for an unknown artist", async () => {
  execute.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
  await expect(draftLatestRefresh("a1", context)).rejects.toThrow("Artist not found");
});
