/** @jest-environment node */
import axios from "axios";
import { workAsyncStorage } from "next/dist/server/app-render/work-async-storage.external";
import { db } from "@/server/db/drizzle";
import { spotifyGet } from "@/server/utils/spotify/spotifyGet";
import { getLatestArtistReleases } from "@/server/utils/musicPlatform/latestReleases";
import { readCachedLatestArtistReleases } from "@/server/utils/musicPlatform/readCachedLatestArtistReleases";
import { getArtistLatest } from "../artistLatestQueries";
import type { Artist } from "@/server/db/DbTypes";

jest.mock("@/server/db/drizzle", () => ({
  db: { transaction: jest.fn() },
}));
jest.mock("@/lib/musicNerdApi/const", () => ({
  MUSICNERD_API_URL: "https://api.example",
}));
jest.mock("axios", () => ({
  __esModule: true,
  default: {
    post: jest.fn(async () => ({
      data: { access_token: "fixture-token", expires_in: 3600 },
    })),
  },
}));
jest.mock("@/server/utils/spotify/spotifyGet", () => ({
  spotifyGet: jest.fn(),
}));
jest.mock("next/cache", () => {
  // Exercise Next's actual unstable_cache serialization and success-only write
  // path; replace only its backing store and the provider/API/DB boundaries.
  Object.defineProperty(globalThis, "AsyncLocalStorage", {
    value: jest.requireActual("node:async_hooks").AsyncLocalStorage,
    configurable: true,
  });
  const entries = new Map<string, unknown>();
  const staleKeys = new Set<string>();
  const state = { entries, staleKeys, writes: 0 };
  const backingStore = {
    generateSimpleCacheKey: async (key: string) => key,
    get: async (key: string) =>
      entries.has(key)
        ? { value: entries.get(key), isStale: staleKeys.has(key) }
        : null,
    set: async (key: string, value: unknown) => {
      state.writes += 1;
      entries.set(key, value);
    },
  };
  Object.defineProperty(globalThis, "__artistLatestTestCache", {
    configurable: true,
    value: state,
  });
  Object.defineProperty(globalThis, "__incrementalCache", {
    configurable: true,
    value: backingStore,
  });
  return jest.requireActual("next/dist/server/web/spec-extension/unstable-cache");
});

const artist = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Artist",
  spotify: "a".repeat(22),
} as Artist;
const spotifyAlbumId = "b".repeat(22);
const fetchMock = jest.fn();
db.transaction = jest.fn();
db.execute = jest.fn();
type TestCacheState = {
  entries: Map<string, unknown>;
  staleKeys: Set<string>;
  writes: number;
};
const cacheState = () =>
  (globalThis as typeof globalThis & { __artistLatestTestCache: TestCacheState })
    .__artistLatestTestCache;

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

beforeEach(() => {
  cacheState().entries.clear();
  cacheState().staleKeys.clear();
  cacheState().writes = 0;
  global.fetch = fetchMock;
  fetchMock.mockReset();
  jest.mocked(axios.post).mockClear();
  jest.mocked(db.execute).mockReset().mockResolvedValue([]);
  jest.mocked(spotifyGet).mockReset().mockResolvedValue({
    data: {
      items: [
        {
          id: spotifyAlbumId,
          name: "Cached Release",
          release_date: "2020-01-02",
          album_type: "album",
          album_group: "album",
          external_urls: {
            spotify: `https://open.spotify.com/album/${spotifyAlbumId}`,
          },
          images: [],
        },
      ],
    },
  } as never);
  jest.mocked(db.transaction).mockReset().mockImplementation(async (callback) =>
    callback({
      execute: jest.fn().mockResolvedValue([{ acquired: true }]),
    } as never),
  );
});

it("keeps a cached release visible when Spotify coverage later fails without a check time", async () => {
  fetchMock
    .mockResolvedValueOnce(
      streamResponse({
        status: "ok",
        unavailable: true,
        items: [],
        coverage: [coverage("missing")],
      }),
    )
    .mockResolvedValueOnce(
      streamResponse({
        status: "ok",
        unavailable: true,
        items: [],
        coverage: [coverage("failed")],
      }),
    );

  const first = await getArtistLatest(artist);
  expect(first.items.map((item) => item.id)).toEqual([
    `release:spotify:${spotifyAlbumId}`,
  ]);
  expect(jest.mocked(axios.post)).toHaveBeenCalledTimes(1);
  expect(jest.mocked(spotifyGet)).toHaveBeenCalledTimes(1);
  expect(jest.mocked(db.transaction)).toHaveBeenCalledTimes(1);

  const tokenCallsBeforeFailure = jest.mocked(axios.post).mock.calls.length;
  const providerCallsBeforeFailure = jest.mocked(spotifyGet).mock.calls.length;
  const budgetCallsBeforeFailure = jest.mocked(db.transaction).mock.calls.length;
  const cacheWritesBeforeFailure = cacheState().writes;

  const second = await getArtistLatest(artist);

  expect(jest.mocked(axios.post)).toHaveBeenCalledTimes(tokenCallsBeforeFailure);
  expect(jest.mocked(spotifyGet)).toHaveBeenCalledTimes(providerCallsBeforeFailure);
  expect(jest.mocked(db.transaction)).toHaveBeenCalledTimes(budgetCallsBeforeFailure);
  expect(cacheState().writes).toBe(cacheWritesBeforeFailure);
  expect(second.displayUnavailable).toBe(true);
  expect(second.displayUnavailableProviders).toEqual(["spotify"]);
  expect(second.coverage).toEqual([coverage("failed")]);
  expect(second.items.map((item) => item.id)).toEqual([
    `release:spotify:${spotifyAlbumId}`,
  ]);
});

it("fails closed for cold, invalidated, and changed Spotify catalog cache keys", async () => {
  const coldArtist = "c".repeat(22);
  const changedArtist = "d".repeat(22);
  await expectCatalogMiss(
    readCachedLatestArtistReleases({ spotify: coldArtist, deezer: null }),
  );
  expect(calls()).toEqual({ tokens: 0, providers: 0, budgets: 0 });
  expect(cacheState().writes).toBe(0);

  const warmed = await warmCatalog(artist.spotify!);
  expect(warmed.items.map((item) => item.id)).toEqual([
    `release:spotify:${spotifyAlbumId}`,
  ]);
  const callsAfterWarm = calls();
  const writesAfterWarm = cacheState().writes;

  await expectCatalogMiss(
    readCachedLatestArtistReleases({ spotify: changedArtist, deezer: null }),
  );

  const key = catalogCacheKey(artist.spotify!);
  cacheState().entries.delete(key);
  cacheState().staleKeys.delete(key);
  await expectCatalogMiss(
    readCachedLatestArtistReleases({ spotify: artist.spotify!, deezer: null }),
  );

  expect(calls()).toEqual(callsAfterWarm);
  expect(cacheState().writes).toBe(writesAfterWarm);
});

it("serves stale App Router catalog cards and rejects background refresh without writing", async () => {
  const warmed = await warmCatalog(artist.spotify!);
  expect(warmed.items.map((item) => item.id)).toEqual([
    `release:spotify:${spotifyAlbumId}`,
  ]);
  const key = catalogCacheKey(artist.spotify!);
  cacheState().staleKeys.add(key);
  fetchMock.mockResolvedValueOnce(
    streamResponse({
      status: "ok",
      unavailable: true,
      items: [],
      coverage: [coverage("failed")],
    }),
  );
  const callsBeforeStaleRead = calls();
  const writesBeforeStaleRead = cacheState().writes;
  const errorLog = jest.spyOn(console, "error").mockImplementation(() => {});
  const workStore = {
    fetchCache: "force-cache",
    isOnDemandRevalidate: false,
    isDraftMode: false,
    isRevalidate: false,
    pendingRevalidates: {},
  };

  const result = await workAsyncStorage.run(workStore as never, () =>
    getArtistLatest(artist),
  );
  await Promise.all(
    Object.values(workStore.pendingRevalidates).map((pending) =>
      Promise.resolve(pending),
    ),
  );

  expect(result.items.map((item) => item.id)).toEqual([
    `release:spotify:${spotifyAlbumId}`,
  ]);
  expect(result.displayUnavailable).toBe(true);
  expect(result.displayUnavailableProviders).toEqual(["spotify"]);
  expect(calls()).toEqual(callsBeforeStaleRead);
  expect(cacheState().writes).toBe(writesBeforeStaleRead);
  expect(errorLog).toHaveBeenCalledWith(
    expect.stringContaining("revalidating cache with key"),
    expect.objectContaining({ message: "Release catalog cache-only read missed" }),
  );
});

it("fails closed when a stale catalog is read outside App Router context", async () => {
  await warmCatalog(artist.spotify!);
  cacheState().staleKeys.add(catalogCacheKey(artist.spotify!));
  const callsBefore = calls();
  const writesBefore = cacheState().writes;

  await expectCatalogMiss(
    readCachedLatestArtistReleases({ spotify: artist.spotify!, deezer: null }),
  );

  expect(calls()).toEqual(callsBefore);
  expect(cacheState().writes).toBe(writesBefore);
});

it("blocks cachedOrDirect's no-Next-context direct fallback", async () => {
  const cacheDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "__incrementalCache",
  );
  const callsBefore = calls();
  const writesBefore = cacheState().writes;
  try {
    Reflect.deleteProperty(globalThis, "__incrementalCache");
    await expectCatalogMiss(
      readCachedLatestArtistReleases({
        spotify: "e".repeat(22),
        deezer: null,
      }),
    );
  } finally {
    if (cacheDescriptor)
      Object.defineProperty(globalThis, "__incrementalCache", cacheDescriptor);
  }

  expect(calls()).toEqual(callsBefore);
  expect(cacheState().writes).toBe(writesBefore);
});

it("allows a normal catalog read after the cache-only scope exits", async () => {
  const coldArtist = "f".repeat(22);
  await expectCatalogMiss(
    readCachedLatestArtistReleases({ spotify: coldArtist, deezer: null }),
  );
  expect(calls()).toEqual({ tokens: 0, providers: 0, budgets: 0 });

  const result = await withBudgetTimers(() =>
    getLatestArtistReleases({ spotify: coldArtist, deezer: null }),
  );

  expect(result.map((release) => release.id)).toEqual([spotifyAlbumId]);
  expect(calls()).toEqual({ tokens: 1, providers: 1, budgets: 1 });
});

it("keeps concurrent normal and cache-only reads isolated", async () => {
  const scopedArtist = "g".repeat(22);
  const normalArtist = "h".repeat(22);
  jest.useFakeTimers();
  const scopedRead = readCachedLatestArtistReleases({
    spotify: scopedArtist,
    deezer: null,
  });
  const normalRead = getLatestArtistReleases({
    spotify: normalArtist,
    deezer: null,
  });
  const results = Promise.allSettled([scopedRead, normalRead]);
  await jest.advanceTimersByTimeAsync(2000);
  const [scoped, normal] = await results;
  jest.useRealTimers();

  expect(scoped.status).toBe("rejected");
  if (scoped.status === "rejected") expectCatalogMissError(scoped.reason);
  expect(normal.status).toBe("fulfilled");
  if (normal.status === "fulfilled")
    expect(normal.value.map((release) => release.id)).toEqual([spotifyAlbumId]);
  expect(calls()).toEqual({ tokens: 1, providers: 1, budgets: 1 });
});

function coverage(status: "missing" | "failed") {
  return {
    provider: "spotify",
    status,
    checkedAt: null,
    lastAttemptAt: null,
    stale: true,
  };
}

function streamResponse(value: unknown) {
  const text = JSON.stringify(value);
  return {
    ok: true,
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(text));
        controller.close();
      },
    }),
  };
}

async function warmCatalog(spotifyId: string) {
  fetchMock.mockResolvedValueOnce(
    streamResponse({
      status: "ok",
      unavailable: true,
      items: [],
      coverage: [coverage("missing")],
    }),
  );
  return withBudgetTimers(() =>
    getArtistLatest({ ...artist, spotify: spotifyId }),
  );
}

async function withBudgetTimers<T>(operation: () => Promise<T>): Promise<T> {
  jest.useFakeTimers();
  try {
    const pending = operation();
    await jest.advanceTimersByTimeAsync(2000);
    return await pending;
  } finally {
    jest.useRealTimers();
  }
}

function calls() {
  return {
    tokens: jest.mocked(axios.post).mock.calls.length,
    providers: jest.mocked(spotifyGet).mock.calls.length,
    budgets: jest.mocked(db.transaction).mock.calls.length,
  };
}

function catalogCacheKey(spotifyId: string) {
  const key = [...cacheState().entries.keys()].find((entry) =>
    entry.includes(`artist-latest-release-catalog-v3,spotify,${spotifyId}`),
  );
  if (!key) throw new Error(`No Spotify cache entry for ${spotifyId}`);
  return key;
}

async function expectCatalogMiss(read: Promise<unknown>) {
  await expect(read).rejects.toMatchObject({
    errors: expect.arrayContaining([
      expect.objectContaining({ message: "Release catalog cache-only read missed" }),
    ]),
  });
}

function expectCatalogMissError(error: unknown) {
  expect(error).toMatchObject({
    errors: expect.arrayContaining([
      expect.objectContaining({ message: "Release catalog cache-only read missed" }),
    ]),
  });
}
