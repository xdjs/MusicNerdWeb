/** @jest-environment node */
jest.mock("@/server/utils/musicPlatform/latestReleases", () => ({
  getLatestArtistReleases: jest.fn(),
}));
jest.mock("@/server/utils/musicPlatform/readCachedLatestArtistReleases", () => ({
  readCachedLatestArtistReleases: jest.fn(),
}));
jest.mock("@/server/utils/fetchCachedArtistTimeline", () => ({
  fetchCachedArtistTimeline: jest.fn(),
}));
import { fillMissingLatestProviders } from "../fillMissingLatestProviders";
import { getLatestArtistReleases } from "@/server/utils/musicPlatform/latestReleases";
import { readCachedLatestArtistReleases } from "@/server/utils/musicPlatform/readCachedLatestArtistReleases";
import { fetchCachedArtistTimeline } from "@/server/utils/fetchCachedArtistTimeline";
import type { Artist } from "@/server/db/DbTypes";
import type { ArtistLatestItem } from "@/lib/artist/artistLatest";
const catalog = jest.mocked(getLatestArtistReleases);
const cachedCatalog = jest.mocked(readCachedLatestArtistReleases);
const timeline = jest.mocked(fetchCachedArtistTimeline);
const artist = {
  name: "Artist",
  spotify: "a".repeat(22),
  deezer: "123",
  inprocess: "0x" + "a".repeat(40),
} as Artist;
const card: ArtistLatestItem = {
  id: "release:deezer:1",
  kind: "release",
  title: "Record",
  text: "album",
  date: "2026-01-02",
  imageUrl: null,
  imageCaption: "art",
  sourceUrl: "https://www.deezer.com/album/1",
  sourceLabel: "Listen",
  listeningLinks: [
    {
      siteName: "deezer",
      href: "https://www.deezer.com/album/1",
      label: "Deezer",
      iconSrc: "/siteIcons/deezer_icon.svg",
    },
  ],
};
beforeEach(() => {
  jest.clearAllMocks();
  catalog.mockResolvedValue([]);
  cachedCatalog.mockReset().mockResolvedValue([]);
  timeline.mockResolvedValue([]);
});
it("uses only missing connected provider IDs, preserving shared cards and coverage ownership", async () => {
  catalog.mockResolvedValue([
    {
      id: "b".repeat(22),
      title: "Record",
      kind: "album",
      releaseDate: "2026-01-02",
      platform: "spotify",
      url: "https://open.spotify.com/album/" + "b".repeat(22),
      imageUrl: null,
      listeningLinks: [
        {
          siteName: "spotify",
          href: "https://open.spotify.com/album/" + "b".repeat(22),
          label: "Spotify",
          iconSrc: "/siteIcons/spotify_icon.svg",
        },
      ],
    },
  ]);
  const result = await fillMissingLatestProviders(
    artist,
    [card],
    [
      { provider: "spotify", status: "missing" },
      { provider: "deezer", status: "checked" },
      { provider: "inprocess", status: "checked" },
    ],
  );
  expect(catalog).toHaveBeenCalledWith({
    spotify: artist.spotify,
    deezer: null,
  });
  expect(timeline).not.toHaveBeenCalled();
  expect(result.items).toHaveLength(1);
  expect(result.items[0].id).toBe(card.id);
  expect(result.items[0].listeningLinks?.map((l) => l.siteName)).toEqual([
    "deezer",
    "spotify",
  ]);
  expect(card.listeningLinks).toHaveLength(1);
});
it.each(["checked", "failed", "disconnected"] as const)(
  "does not retry %s snapshots even when stale or empty",
  async (status) => {
    expect(
      await fillMissingLatestProviders(
        artist,
        [],
        [
          { provider: "spotify", status },
          { provider: "inprocess", status },
        ],
      ),
    ).toEqual({ items: [], recoveredProviders: [] });
    expect(catalog).not.toHaveBeenCalled();
    expect(timeline).not.toHaveBeenCalled();
  },
);
it("does not treat absent coverage or a disconnected artist as permission to fetch", async () => {
  await fillMissingLatestProviders(artist, [], []);
  await fillMissingLatestProviders(
    { ...artist, spotify: null, deezer: null, inprocess: null },
    [],
    [
      { provider: "spotify", status: "missing" },
      { provider: "inprocess", status: "missing" },
    ],
  );
  expect(catalog).not.toHaveBeenCalled();
  expect(timeline).not.toHaveBeenCalled();
});
it("keeps good shared data if the compatibility catalog fails", async () => {
  catalog.mockRejectedValue(new Error("offline"));
  expect(
    await fillMissingLatestProviders(
      artist,
      [card],
      [{ provider: "spotify", status: "missing" }],
    ),
  ).toEqual({ items: [card], recoveredProviders: [] });
});
it("caps merged releases at three without collapsing different editions or types", async () => {
  catalog.mockResolvedValue(
    Array.from({ length: 3 }, (_, i) => ({
      id: String(i + 2),
      title: i === 0 ? "Record" : "Record deluxe",
      kind: i === 1 ? "single" : "album",
      releaseDate: `2026-02-0${i + 1}`,
      platform: "deezer" as const,
      url: `https://www.deezer.com/album/${i + 2}`,
      imageUrl: null,
    })),
  );
  const result = await fillMissingLatestProviders(
    artist,
    [card],
    [{ provider: "deezer", status: "missing" }],
  );
  expect(result.items).toHaveLength(3);
  expect(result.items.map((c) => c.date)).toEqual([
    "2026-02-03",
    "2026-02-02",
    "2026-02-01",
  ]);
});
it("uses the timeline helper only for a missing connected InProcess snapshot", async () => {
  await fillMissingLatestProviders(
    artist,
    [],
    [{ provider: "inprocess", status: "missing" }],
  );
  expect(timeline).toHaveBeenCalledWith(artist.inprocess);
  expect(catalog).not.toHaveBeenCalled();
});

it("records each catalog separately so one successful fallback cannot conceal another failure", async () => {
  catalog.mockImplementation(async value => { if (value.spotify) throw new Error("offline"); return []; });
  const result = await fillMissingLatestProviders(artist, [card], [
    { provider: "spotify", status: "missing" }, { provider: "deezer", status: "missing" },
  ]);
  expect(result.items).toEqual([card]);
  expect(result.recoveredProviders).toEqual(["deezer"]);
  expect(catalog).toHaveBeenCalledTimes(2);
});
it("distinguishes a checked-empty timeline from a failed one", async () => {
  const coverage = [{ provider: "inprocess" as const, status: "missing" as const }];
  expect((await fillMissingLatestProviders(artist, [], coverage)).recoveredProviders).toEqual(["inprocess"]);
  timeline.mockRejectedValueOnce(new Error("offline"));
  expect((await fillMissingLatestProviders(artist, [], coverage)).recoveredProviders).toEqual([]);
});
it("does not label malformed connected IDs as successfully checked", async () => {
  const result = await fillMissingLatestProviders({ ...artist, spotify: "bad", deezer: "bad", inprocess: "bad" }, [], [
    { provider: "spotify", status: "missing" }, { provider: "deezer", status: "missing" }, { provider: "inprocess", status: "missing" },
  ]);
  expect(result.recoveredProviders).toEqual([]);
  expect(catalog).not.toHaveBeenCalled();
  expect(timeline).not.toHaveBeenCalled();
});


it.each(["spotify", "deezer"] as const)("reads only cached %s releases for a first failed snapshot without marking it recovered", async provider => {
  cachedCatalog.mockResolvedValue([{ id: "123", title: "Cached", kind: "album", releaseDate: "2020-01-01", platform: provider,
    url: "https://www.deezer.com/album/123", imageUrl: null }]);
  const result = await fillMissingLatestProviders(artist, [], [{ provider, status: "failed", checkedAt: null }]);
  expect(cachedCatalog).toHaveBeenCalledWith({ spotify: provider === "spotify" ? artist.spotify : null, deezer: provider === "deezer" ? artist.deezer : null });
  expect(result.items.map(item => item.title)).toEqual(["Cached"]);
  expect(result.recoveredProviders).toEqual([]);
  expect(catalog).not.toHaveBeenCalled();
  expect(timeline).not.toHaveBeenCalled();
});
it.each([
  { status: "failed" as const, checkedAt: "2026-01-02T00:00:00Z" },
  { status: "failed" as const },
  { status: "checked" as const, checkedAt: null },
  { status: "checked" as const, checkedAt: "2026-01-02T00:00:00Z" },
  { status: "disconnected" as const, checkedAt: null },
])("does not supplement retained or checked-empty snapshots: %j", async snapshot => {
  const result = await fillMissingLatestProviders(artist, [card], [{ provider: "spotify", ...snapshot }]);
  expect(result).toEqual({ items: [card], recoveredProviders: [] });
  expect(cachedCatalog).not.toHaveBeenCalled();
  expect(catalog).not.toHaveBeenCalled();
});
it("keeps a first failed timeline unchanged and rejects invalid or removed catalog connections", async () => {
  for (const spotify of [null, "bad"]) {
    await fillMissingLatestProviders({ ...artist, spotify }, [], [
      { provider: "spotify", status: "failed", checkedAt: null },
      { provider: "inprocess", status: "failed", checkedAt: null },
    ]);
  }
  await fillMissingLatestProviders(artist, [], []);
  expect(cachedCatalog).not.toHaveBeenCalled();
  expect(catalog).not.toHaveBeenCalled();
  expect(timeline).not.toHaveBeenCalled();
});
it("keeps shared cards when a failed snapshot has no usable cache", async () => {
  cachedCatalog.mockRejectedValueOnce(new Error("cache unavailable"));
  expect(await fillMissingLatestProviders(artist, [card], [{ provider: "spotify", status: "failed", checkedAt: null }]))
    .toEqual({ items: [card], recoveredProviders: [] });
  expect(catalog).not.toHaveBeenCalled();
});
it("deduplicates failed cached releases against shared cards and caps the merged display", async () => {
  cachedCatalog.mockResolvedValue([
    { id: "1", title: card.title, kind: card.text, releaseDate: card.date, platform: "spotify", url: "https://open.spotify.com/album/1", imageUrl: null,
      listeningLinks: [{ siteName: "spotify", href: "https://open.spotify.com/album/1", label: "Spotify", iconSrc: "/siteIcons/spotify_icon.svg" }] },
    ...[2, 3, 4].map(id => ({ id: String(id), title: `Older ${id}`, kind: "album", releaseDate: `2020-01-0${id}`, platform: "spotify" as const, url: `https://open.spotify.com/album/${id}`, imageUrl: null })),
  ]);
  const result = await fillMissingLatestProviders(artist, [card], [{ provider: "spotify", status: "failed", checkedAt: null }]);
  expect(result.items).toHaveLength(3);
  expect(result.items[0].id).toBe(card.id);
  expect(result.items[0].listeningLinks?.map(link => link.siteName)).toEqual(["deezer", "spotify"]);
  expect(card.listeningLinks).toHaveLength(1);
  expect(result.recoveredProviders).toEqual([]);
});
