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

it("recovers the same paid run after a temporary status error", async () => {
  const j = job(); Object.assign(j.state, {runId:"paid-run",providerStarted:true});
  jest.mocked(checkInstagramScrape).mockResolvedValueOnce({status:"failed",reason:"apify status 503",retryable:true})
    .mockResolvedValueOnce({status:"ready",runId:"paid-run",datasetId:"saved-dataset"});
  jest.mocked(collectInstagramScrape).mockResolvedValueOnce({ingested:5,ownPosts:5,collabPosts:0});
  await expect(refreshLatestInstagram(j, Date.now()+55000)).rejects.toThrow("apify status 503");
  expect(j.state).toMatchObject({instagramFailure:{phase:"status",reason:"apify status 503",at:expect.any(String)}});
  expect(jest.mocked(latestRefreshStore)).toHaveBeenCalledWith(j,j.state);
  expect(await refreshLatestInstagram(j, Date.now()+55000)).toMatchObject({status:"checked"});
  expect(jest.mocked(checkInstagramScrape).mock.calls.map(a => a[0])).toEqual(["paid-run","paid-run"]);
  expect(jest.mocked(startLatestInstagramScrape)).not.toHaveBeenCalled();
});
it("records confirmed terminal failure without retrying or paying again", async () => {
  const j=job(); j.state.runId="paid-run";
  jest.mocked(checkInstagramScrape).mockResolvedValueOnce({status:"failed",reason:"apify run FAILED"});
  expect(await refreshLatestInstagram(j,Date.now()+55000)).toEqual({status:"failed"});
  expect(j.state).toMatchObject({instagramFailure:{phase:"status",reason:"apify run FAILED"}});
  expect(jest.mocked(startLatestInstagramScrape)).not.toHaveBeenCalled();
});
it("recovers collection from the saved dataset without polling or paying again", async () => {
  const j=job(); Object.assign(j.state,{runId:"paid-run",datasetId:"saved-dataset"});
  jest.mocked(collectInstagramScrape).mockResolvedValueOnce(null).mockResolvedValueOnce({ingested:5,ownPosts:5,collabPosts:0});
  await expect(refreshLatestInstagram(j,Date.now()+55000)).rejects.toThrow("Instagram collection unavailable");
  expect(await refreshLatestInstagram(j,Date.now()+55000)).toMatchObject({status:"checked"});
  expect(jest.mocked(checkInstagramScrape)).not.toHaveBeenCalled();
  expect(jest.mocked(startLatestInstagramScrape)).not.toHaveBeenCalled();
});
