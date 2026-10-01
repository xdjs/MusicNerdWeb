/** @jest-environment node */
jest.mock("@/env", () => ({ APIFY_API_TOKEN: "tok" }));
import { checkInstagramScrape } from "@/server/utils/instagram/checkInstagramScrape";

const fetchMock = jest.fn();
const json = (body: unknown, ok = true, status = 200) => ({ ok, status, json: async () => body });

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock;

});

describe("checkInstagramScrape", () => {
  it("maps Apify's run states", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ data: { status: "SUCCEEDED", defaultDatasetId: "ds" } }),
    );
    expect(await checkInstagramScrape("run")).toEqual({
      status: "ready",
      runId: "run",
      datasetId: "ds",
    });
    fetchMock.mockResolvedValueOnce(json({ data: { status: "RUNNING" } }));
    expect(await checkInstagramScrape("run")).toEqual({ status: "running", runId: "run" });
    fetchMock.mockResolvedValueOnce(json({ data: { status: "ABORTED" } }));
    expect(await checkInstagramScrape("run")).toEqual({
      status: "failed",
      reason: "apify run ABORTED",
    });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.apify.com/v2/actor-runs/run?token=tok");
  });

  it("distinguishes a permanent HTTP error from a temporary fetch failure", async () => {
    fetchMock.mockResolvedValueOnce(json({}, false, 404));
    expect(await checkInstagramScrape("run")).toEqual({
      status: "failed",
      reason: "apify status 404",
    });
    fetchMock.mockRejectedValueOnce(new Error("reset"));
    expect(await checkInstagramScrape("run")).toEqual({ status: "failed", reason: "apify status unavailable", retryable: true });
  });
});

it.each([408, 429, 500, 502, 503, 504])("retries HTTP %s without declaring the run failed", async status => {
  fetchMock.mockResolvedValueOnce(json({}, false, status));
  expect(await checkInstagramScrape("paid-run")).toEqual({ status: "failed", reason: `apify status ${status}`, retryable: true });
});
it.each(["READY", "RUNNING", "TIMING-OUT", "ABORTING"])("waits for transitional %s", async status => {
  fetchMock.mockResolvedValueOnce(json({ data: { status } }));
  expect(await checkInstagramScrape("paid-run")).toEqual({ status: "running", runId: "paid-run" });
});
it.each([{data:{status:"SUCCEEDED"}}, {}, {data:{status:"unexpected secret-token"}}])("retries incomplete responses safely", async body => {
  fetchMock.mockResolvedValueOnce(json(body));
  expect(await checkInstagramScrape("paid-run")).toEqual({ status: "failed", reason: "apify status invalid response", retryable: true });
});
it("does not expose exception URLs or credentials", async () => {
  fetchMock.mockRejectedValueOnce(new Error("https://api.apify.com/?token=secret"));
  expect(JSON.stringify(await checkInstagramScrape("run"))).not.toContain("secret");
});
