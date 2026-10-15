/** @jest-environment node */
jest.mock("@/server/db/drizzle", () => ({ db: {} }));
jest.mock("@/server/utils/questionGenerator", () => ({
  sourceUrlsForQuestionKeys: jest.fn(),
}));
jest.mock("@/lib/musicNerdApi/const", () => ({
  MUSICNERD_API_URL: "https://api.example",
}));
jest.mock("@/server/utils/musicPlatform/latestReleases", () => ({
  getLatestArtistReleases: jest.fn(),
}));
jest.mock("@/server/utils/fetchCachedArtistTimeline", () => ({
  fetchCachedArtistTimeline: jest.fn(),
}));
import { getLatestArtistReleases } from "@/server/utils/musicPlatform/latestReleases";
import { fetchCachedArtistTimeline } from "@/server/utils/fetchCachedArtistTimeline";
import { getArtistLatest } from "../artistLatestQueries";
import type { Artist } from "@/server/db/DbTypes";
const artist = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Artist",
} as Artist;
const fetchMock = jest.fn();
beforeEach(() => {
  global.fetch = fetchMock;
  fetchMock.mockReset();
  jest.mocked(getLatestArtistReleases).mockReset().mockResolvedValue([]);
  jest.mocked(fetchCachedArtistTimeline).mockReset().mockResolvedValue([]);
});
it("reads only the shared public endpoint and preserves partial dates", async () => {
  fetchMock.mockResolvedValue(
    streamResponse(
      JSON.stringify({
        status: "ok",
        unavailable: false,
        coverage: [],
        items: [
          {
            id: "release:1",
            kind: "release",
            title: "Record",
            text: "Album",
            date: "2020-02",
            imageUrl: null,
            imageCaption: "art",
            sourceUrl: "https://open.spotify.com/album/1",
            sourceLabel: "Listen",
          },
        ],
      }),
    ),
  );
  const result = await getArtistLatest(artist);
  expect(result.items[0].date).toBe("2020-02");
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(String(fetchMock.mock.calls[0][0])).toBe(
    `https://api.example/api/artist/${artist.id}/latest`,
  );
});
it("does not fall back to live provider requests on failure", async () => {
  fetchMock.mockResolvedValue(streamResponse("", { status: 503 }));
  expect(await getArtistLatest(artist)).toEqual({
    items: [],
    unavailable: true,
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("rejects unsafe source URLs rather than rendering them", async () => {
  fetchMock.mockResolvedValue(
    streamResponse(
      JSON.stringify({
        status: "ok",
        unavailable: false,
        coverage: [],
        items: [
          {
            id: "1",
            kind: "release",
            title: "Record",
            text: "Album",
            date: "2020",
            imageUrl: null,
            imageCaption: "art",
            sourceUrl: "javascript:alert(1)",
            sourceLabel: "Listen",
          },
        ],
      }),
    ),
  );
  expect((await getArtistLatest(artist)).unavailable).toBe(true);
});

function streamResponse(text: string, init?: { status?: number }) {
  return {
    ok: !init?.status || init.status < 400,
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(text));
        controller.close();
      },
    }),
  };
}

it("fills only explicitly missing snapshots after API validation, retaining shared coverage but clearing the recovered display failure", async () => {
  const coverage = [
    {
      provider: "deezer",
      status: "missing",
      checkedAt: null,
      lastAttemptAt: null,
      stale: true,
    },
  ];
  fetchMock.mockResolvedValue(
    streamResponse(
      JSON.stringify({ status: "ok", items: [], coverage, unavailable: true }),
    ),
  );
  jest
    .mocked(getLatestArtistReleases)
    .mockResolvedValue([
      {
        id: "123",
        title: "Record",
        kind: "ep",
        releaseDate: "2026-01-02",
        platform: "deezer",
        url: "https://www.deezer.com/album/123",
        imageUrl: null,
      },
    ]);
  const result = await getArtistLatest({ ...artist, deezer: "456" });
  expect(result.items).toHaveLength(1);
  expect(result.unavailable).toBe(true);
  expect(result.coverage).toEqual(coverage);
  expect(result.displayUnavailable).toBe(false);
  expect(getLatestArtistReleases).toHaveBeenCalledWith({
    spotify: null,
    deezer: "456",
  });
});
it("never calls compatibility providers after API failure", async () => {
  fetchMock.mockResolvedValue(streamResponse("", { status: 503 }));
  await getArtistLatest({
    ...artist,
    deezer: "456",
    inprocess: "0x" + "a".repeat(40),
  });
  expect(getLatestArtistReleases).not.toHaveBeenCalled();
  expect(fetchCachedArtistTimeline).not.toHaveBeenCalled();
});

it("keeps the display warning when any shared provider remains failed", async () => {
  const coverage = ["spotify", "deezer"].map(provider => ({ provider, status: provider === "spotify" ? "failed" : "missing", checkedAt: null, lastAttemptAt: null, stale: true }));
  fetchMock.mockResolvedValue(streamResponse(JSON.stringify({ status: "ok", items: [], coverage, unavailable: true })));
  const result = await getArtistLatest({ ...artist, spotify: "a".repeat(22), deezer: "456" });
  expect(result.displayUnavailable).toBe(true);
  expect(result.displayUnavailableProviders).toEqual(["spotify"]);
  expect(result.coverage).toEqual(coverage);
});
it("does not hide an unexplained API failure flag", async () => {
  fetchMock.mockResolvedValue(streamResponse(JSON.stringify({ status: "ok", items: [], coverage: [], unavailable: true })));
  expect((await getArtistLatest(artist)).displayUnavailable).toBe(true);
});
