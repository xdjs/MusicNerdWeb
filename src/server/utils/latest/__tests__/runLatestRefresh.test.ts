// @ts-nocheck
jest.mock("../latestRefreshStore", () => ({ latestRefreshStore: jest.fn() }));
jest.mock("../refreshLatestSource", () => ({ refreshLatestSource: jest.fn() }));
jest.mock("../refreshLatestInstagram", () => ({
  refreshLatestInstagram: jest.fn(),
}));
import { runLatestRefresh } from "../runLatestRefresh";
import { latestRefreshStore } from "../latestRefreshStore";
import { refreshLatestSource } from "../refreshLatestSource";
import { refreshLatestInstagram } from "../refreshLatestInstagram";
const job = {
  id: "job",
  artistId: "artist",
  kind: "latest_refresh",
  activityId: "activity",
  state: {
    claimId: "claim",
    sources: {
      deezer: { status: "disconnected" },
      inprocess: { status: "pending" },
      spotify: { status: "pending" },
      instagram: { status: "pending" },
      interviews: { status: "pending" },
    },
  },
};
beforeEach(() => {
  jest.clearAllMocks();
  latestRefreshStore.mockResolvedValue(undefined);
  refreshLatestSource.mockResolvedValue({ status: "checked" });
  refreshLatestInstagram.mockResolvedValue({ status: "checked" });
});
it("checks non-Instagram sources separately and persists a partial failure without losing successes", async () => {
  refreshLatestSource.mockImplementation(async (_job, source) => {
    if (source === "spotify") throw Error("secret provider payload");
    return { status: "checked" };
  });
  await runLatestRefresh(JSON.parse(JSON.stringify(job)), Date.now() + 55000);
  const state = latestRefreshStore.mock.calls.at(-1)[1];
  expect(state.sources.inprocess.status).toBe("checked");
  expect(state.sources.spotify.status).toBe("failed");
  expect(state.sources.interviews.status).toBe("checked");
  expect(JSON.stringify(state)).not.toContain("secret");
});
it("does not repeat completed sources on a resumed slice", async () => {
  const resumed = JSON.parse(JSON.stringify(job));
  resumed.state.sources.inprocess = { status: "checked" };
  await runLatestRefresh(resumed, Date.now() + 55000);
  expect(refreshLatestSource.mock.calls.map((c) => c[1])).not.toContain(
    "inprocess",
  );
});
it("keeps the job pending while Instagram is running", async () => {
  refreshLatestInstagram.mockResolvedValue({ status: "pending" });
  expect(
    await runLatestRefresh(JSON.parse(JSON.stringify(job)), Date.now() + 55000),
  ).toMatchObject({ done: false, waiting: true });
  expect(latestRefreshStore.mock.calls.at(-1)[2]).toBe(false);
});
