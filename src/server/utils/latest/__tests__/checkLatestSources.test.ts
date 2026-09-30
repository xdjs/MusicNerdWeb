// @ts-nocheck
jest.mock("../refreshLatestSource", () => ({ refreshLatestSource: jest.fn() }));
import { checkLatestSources } from "../checkLatestSources";
import { refreshLatestSource } from "../refreshLatestSource";

const state = {
  claimId: null,
  userId: "u",
  sources: {
    instagram: { status: "pending" },
    inprocess: { status: "pending" },
    spotify: { status: "pending" },
    deezer: { status: "disconnected" },
    interviews: { status: "pending" },
  },
};
beforeEach(() => jest.clearAllMocks());

it("checks every pending source but Instagram, which MusicNerdAPI checks", async () => {
  refreshLatestSource.mockResolvedValue({ status: "checked", checkedAt: "t" });
  const sources = await checkLatestSources("artist", state);
  expect(refreshLatestSource.mock.calls.map(c => c[2]).sort()).toEqual(["inprocess", "interviews", "spotify"]);
  expect(sources).toEqual({
    instagram: { status: "pending" },
    inprocess: { status: "checked", checkedAt: "t" },
    spotify: { status: "checked", checkedAt: "t" },
    deezer: { status: "disconnected" },
    interviews: { status: "checked", checkedAt: "t" },
  });
  expect(state.sources.inprocess).toEqual({ status: "pending" });
});

it("marks one failing source failed without hiding the others", async () => {
  refreshLatestSource.mockImplementation(async (_a, _s, source) => {
    if (source === "spotify") throw Error("down");
    return { status: "checked", checkedAt: "t" };
  });
  const sources = await checkLatestSources("artist", state);
  expect(sources.spotify).toEqual({ status: "failed" });
  expect(sources.inprocess.status).toBe("checked");
});
