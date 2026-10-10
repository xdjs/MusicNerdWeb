/** @jest-environment node */
jest.mock("@/server/utils/musicPlatform/latestReleases", () => ({
  getLatestArtistReleases: jest.fn(),
}));
jest.mock("@/server/utils/fetchArtistTimeline", () => ({
  fetchArtistTimeline: jest.fn(),
}));
import { fillMissingLatestProviders } from "../fillMissingLatestProviders";
import { getLatestArtistReleases } from "@/server/utils/musicPlatform/latestReleases";
import { fetchArtistTimeline } from "@/server/utils/fetchArtistTimeline";
import type { Artist } from "@/server/db/DbTypes";
import type { ArtistLatestItem } from "@/lib/artist/artistLatest";
const catalog = jest.mocked(getLatestArtistReleases);
const timeline = jest.mocked(fetchArtistTimeline);
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
  expect(result).toHaveLength(1);
  expect(result[0].id).toBe(card.id);
  expect(result[0].listeningLinks?.map((l) => l.siteName)).toEqual([
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
    ).toEqual([]);
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
  ).toEqual([card]);
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
  expect(result).toHaveLength(3);
  expect(result.map((c) => c.date)).toEqual([
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
