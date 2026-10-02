// @ts-nocheck
const execute = jest.fn();
jest.mock("../../queries/ownershipWrites", () => ({ withScopedArtistWrite: async (_a, fn) => fn({ execute }) }));
jest.mock("../findLatestRefreshId", () => ({ findLatestRefreshId: jest.fn(async () => null) }));
jest.mock("../../activity/recordArtistActivity", () => ({ recordArtistActivity: jest.fn(async () => "act-1") }));
import { saveLatestRefresh } from "../saveLatestRefresh";
import { findLatestRefreshId } from "../findLatestRefreshId";

const artistRow = { instagram: "ig", inprocess: null, spotify: "sp", deezer: null };
const state = (instagram = "pending") => ({
  claimId: "c1", userId: "u1", instagram: "ig", inprocess: "", spotify: "sp", deezer: "",
  sources: { instagram: { status: instagram }, inprocess: { status: "disconnected" }, spotify: { status: "checked" }, deezer: { status: "disconnected" }, interviews: { status: "checked" } },
});
const insertSql = () => JSON.stringify(execute.mock.calls.at(-1)[0]);
beforeEach(() => { execute.mockReset(); findLatestRefreshId.mockResolvedValue(null); });

it("returns a request that queued first", async () => {
  findLatestRefreshId.mockResolvedValueOnce("job-0");
  expect(await saveLatestRefresh("a1", state())).toBe("job-0");
  expect(execute).not.toHaveBeenCalled();
});

it("returns null when a connection changed during the checks", async () => {
  execute.mockResolvedValueOnce([{ ...artistRow, instagram: "renamed" }]);
  expect(await saveLatestRefresh("a1", state())).toBeNull();
  expect(execute).toHaveBeenCalledTimes(1);
});

it("queues the Instagram check as pending", async () => {
  execute.mockResolvedValueOnce([artistRow]).mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "job-1" }]);
  expect(await saveLatestRefresh("a1", state())).toBe("job-1");
  expect(insertSql()).toContain("pending");
});

it("saves the request as done when Instagram has nothing to check", async () => {
  execute.mockResolvedValueOnce([artistRow]).mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "job-2" }]);
  await saveLatestRefresh("a1", state("disconnected"));
  expect(insertSql()).toContain("done");
});

it("leaves Instagram to research that already owns it", async () => {
  execute.mockResolvedValueOnce([artistRow]).mockResolvedValueOnce([{ id: "ingest" }]).mockResolvedValueOnce([{ id: "job-3" }]);
  const s = state();
  await saveLatestRefresh("a1", s);
  expect(s.sources.instagram).toEqual({ status: "failed" });
  expect(insertSql()).toContain("done");
});
