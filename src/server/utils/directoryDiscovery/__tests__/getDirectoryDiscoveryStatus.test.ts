/** @jest-environment node */
import { db } from "@/server/db/drizzle";
import { getDirectoryDiscoveryStatus } from "../getDirectoryDiscoveryStatus";
const execute = jest.fn();
const findArtist = jest.fn();
const findSources = jest.fn();
jest.mock("@/server/db/drizzle", () => ({
  db: {
    execute: (...args: unknown[]) => execute(...args),
    query: {
      artists: { findFirst: (...args: unknown[]) => findArtist(...args) },
      artistVaultSources: {
        findMany: (...args: unknown[]) => findSources(...args),
      },
    },
  },
}));
jest.mock("@/server/utils/queries/artistQueries", () => ({
  getArtistLinks: async () => [],
}));
jest.mock("@/server/utils/musicLinks/getConflictingMusicSourceIds", () => ({
  getConflictingMusicSourceIds: async () => [],
}));
jest.mock("@/server/utils/artistLinkReview/getHiddenLinkSourceIds", () => ({
  getHiddenLinkSourceIds: async () => [],
}));
beforeEach(() => {
  Object.assign(db, { execute });
  db.query.artists.findFirst = findArtist;
  db.query.artistVaultSources.findMany = findSources;
  execute.mockReset();
  findArtist.mockReset().mockResolvedValue({ id: "artist", deezer: "123" });
  findSources.mockReset().mockResolvedValue([]);
});
it("does not read artist or sources when the fresh creation scope is not authorized", async () => {
  execute.mockResolvedValue([]);
  await expect(
    getDirectoryDiscoveryStatus("artist", "viewer"),
  ).resolves.toBeNull();
  expect(findArtist).not.toHaveBeenCalled();
  expect(findSources).not.toHaveBeenCalled();
});
it.each(["active", "complete", "failed", "stopped"])(
  "returns only %s and a public fingerprint, never persisted payloads",
  async (state) => {
    execute.mockResolvedValue([
      { state, private_state: { passage: "secret" }, actor: "secret" },
    ]);
    const result = await getDirectoryDiscoveryStatus("artist", "viewer");
    expect(result).toEqual({
      state,
      revision: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
  },
);
it("does not report a database read failure as completed work", async () => {
  execute.mockRejectedValue(new Error("unavailable"));
  await expect(getDirectoryDiscoveryStatus("artist", "viewer")).rejects.toThrow(
    "unavailable",
  );
});
it("reads status before the final destination snapshot so terminal writes are included", async () => {
  execute.mockImplementation(async () => {
    findArtist.mockResolvedValue({
      id: "artist",
      deezer: "123",
      spotify: "just-saved",
    });
    return [{ state: "complete" }];
  });
  await getDirectoryDiscoveryStatus("artist", "viewer");
  expect(execute.mock.invocationCallOrder[0]).toBeLessThan(
    findArtist.mock.invocationCallOrder[0],
  );
});
