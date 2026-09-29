jest.mock("@/env", () => ({ APIFY_API_TOKEN: "fake-test" }));
jest.mock("../latestRefreshStore", () => ({ latestRefreshStore: jest.fn() }));
jest.mock("../startLatestInstagramScrape", () => ({
  startLatestInstagramScrape: jest.fn(),
}));
jest.mock("../../socialIngest", () => ({
  checkInstagramScrape: jest.fn(),
  collectInstagramScrape: jest.fn(),
}));
import { refreshLatestInstagram } from "../refreshLatestInstagram";
import { latestRefreshStore } from "../latestRefreshStore";
import { startLatestInstagramScrape } from "../startLatestInstagramScrape";
import {
  checkInstagramScrape,
  collectInstagramScrape,
} from "../../socialIngest";
import type { ResearchJob } from "../../queries/researchJobQueries";
const job = (): ResearchJob => ({
  id: "job",
  artistId: "artist",
  kind: "latest_refresh", status: "running", cursor: 0, total: null, attempts: 0, updatedAt: null,
  state: { instagram: "artist" },
});
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(latestRefreshStore).mockResolvedValue(undefined);
  jest.mocked(startLatestInstagramScrape).mockResolvedValue("run");
});
it("persists start intent before payment and saves the returned run", async () => {
  const j = job();
  await refreshLatestInstagram(j, Date.now() + 55000);
  expect(jest.mocked(latestRefreshStore).mock.invocationCallOrder[0]).toBeLessThan(
    jest.mocked(startLatestInstagramScrape).mock.invocationCallOrder[0],
  );
  expect(j.state).toMatchObject({ providerStarted: true, runId: "run" });
});
it("does not start twice after an ambiguous response", async () => {
  jest.mocked(startLatestInstagramScrape).mockResolvedValue(null);
  const j = job();
  expect(await refreshLatestInstagram(j, Date.now() + 55000)).toEqual({
    status: "failed",
  });
  expect(await refreshLatestInstagram(j, Date.now() + 55000)).toEqual({
    status: "failed",
  });
  expect(startLatestInstagramScrape).toHaveBeenCalledTimes(1);
});
it("never pays if the durable intent write fails", async () => {
  jest.mocked(latestRefreshStore).mockRejectedValueOnce(Error("db down"));
  await expect(
    refreshLatestInstagram(job(), Date.now() + 55000),
  ).rejects.toThrow();
  expect(startLatestInstagramScrape).not.toHaveBeenCalled();
});
it("resumes the existing dataset with collection-only bounds", async () => {
  const j = job();
  j.state.runId = "existing";
  jest.mocked(checkInstagramScrape).mockResolvedValue({
    status: "ready",
    runId: "existing",
    datasetId: "dataset",
  });
  jest.mocked(collectInstagramScrape).mockResolvedValue({ ingested: 4, ownPosts: 4, collabPosts: 0 });
  expect(await refreshLatestInstagram(j, Date.now() + 55000)).toMatchObject({
    status: "checked",
  });
  expect(startLatestInstagramScrape).not.toHaveBeenCalled();
  expect(collectInstagramScrape).toHaveBeenCalledWith(
    "artist",
    "artist",
    "dataset",
    "job",
    0,
    { latestOnly: true },
  );
});
