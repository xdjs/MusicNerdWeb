// @ts-nocheck
jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }));
jest.mock("../../fetchTimelineDirect", () => ({ fetchTimelineDirect: jest.fn() }));
jest.mock("../../musicPlatform/latestReleases", () => ({
  getLatestArtistReleases: jest.fn(),
}));
import { refreshLatestSource } from "../refreshLatestSource";
import { revalidateTag } from "next/cache";
import { getLatestArtistReleases } from "../../musicPlatform/latestReleases";
import { fetchTimelineDirect } from "../../fetchTimelineDirect";
const address = "0x" + "a".repeat(40);
const job = {
  artistId: "artist",
  state: { inprocess: address, spotify: "s".repeat(22), deezer: "123" },
};
beforeEach(() => jest.clearAllMocks());
it("refreshes only the connected In Process cache and lets failures surface", async () => {
  await refreshLatestSource(job, "inprocess");
  expect(revalidateTag).toHaveBeenCalledWith(`latest:inprocess:${address}`);
  expect(fetchTimelineDirect).toHaveBeenCalledWith(address);
  revalidateTag.mockClear();
  fetchTimelineDirect.mockRejectedValueOnce(Error("unavailable"));
  await expect(refreshLatestSource(job, "inprocess")).rejects.toThrow();
  expect(revalidateTag).not.toHaveBeenCalled();
});
it("checks each catalog independently so one provider cannot hide another failure", async () => {
  await refreshLatestSource(job, "spotify");
  expect(getLatestArtistReleases).toHaveBeenCalledWith({
    spotify: "s".repeat(22),
    deezer: null,
  }, { fresh: true });
  expect(revalidateTag).toHaveBeenCalledWith(`latest:spotify:${"s".repeat(22)}`);
});
it("does not call providers for disconnected sources", async () => {
  expect(await refreshLatestSource({ state: {} }, "inprocess")).toEqual({
    status: "disconnected",
  });
  expect(await refreshLatestSource({ state: {} }, "deezer")).toEqual({
    status: "disconnected",
  });
  expect(revalidateTag).not.toHaveBeenCalled();
});

it("keeps catalog caches intact when a fresh provider check fails", async () => {
  getLatestArtistReleases.mockRejectedValueOnce(Error("unavailable"));
  await expect(refreshLatestSource(job, "spotify")).rejects.toThrow();
  expect(revalidateTag).not.toHaveBeenCalled();
});
