import type { Artist } from "@/server/db/DbTypes";
import { getLatestArtistReleases } from "@/server/utils/musicPlatform/latestReleases";
import { fetchArtistTimeline } from "@/server/utils/fetchArtistTimeline";
import { momentToLatestItem } from "@/lib/artist/momentToLatestItem";
import {
  orderLatestItems,
  type ArtistLatestItem,
} from "@/lib/artist/artistLatest";

type Coverage = {
  provider: "spotify" | "deezer" | "inprocess";
  status: "checked" | "failed" | "missing" | "disconnected";
};

/** Temporary display compatibility for explicitly missing snapshots; never writes or supplies research evidence. */
export async function fillMissingLatestProviders(
  artist: Artist,
  items: ArtistLatestItem[],
  coverage: Coverage[],
): Promise<ArtistLatestItem[]> {
  const missing = (provider: Coverage["provider"]) =>
    Boolean(artist[provider]) &&
    coverage.some((c) => c.provider === provider && c.status === "missing");
  const spotify = missing("spotify") ? artist.spotify : null;
  const deezer = missing("deezer") ? artist.deezer : null;
  const [catalog, timeline] = await Promise.allSettled([
    spotify || deezer
      ? getLatestArtistReleases({ spotify, deezer })
      : Promise.resolve([]),
    missing("inprocess")
      ? fetchArtistTimeline(artist.inprocess)
      : Promise.resolve([]),
  ]);
  const extras: ArtistLatestItem[] = [];
  if (catalog.status === "fulfilled")
    for (const release of catalog.value)
      extras.push({
        id: `release:${release.platform}:${release.id}`,
        kind: "release",
        title: release.title,
        text: release.kind,
        date: release.releaseDate,
        imageUrl: release.imageUrl,
        imageCaption: `${release.title} artwork`,
        sourceUrl: release.url,
        sourceLabel: `Listen on ${release.platform === "spotify" ? "Spotify" : "Deezer"}`,
        listeningLinks: release.listeningLinks,
      });
  if (timeline.status === "fulfilled")
    extras.push(...timeline.value.map(momentToLatestItem));
  const releases = new Map<string, ArtistLatestItem>();
  const other: ArtistLatestItem[] = [];
  for (const item of [...items, ...extras]) {
    if (item.kind !== "release") {
      other.push(item);
      continue;
    }
    // API and compatibility catalog cards use the exact release type in text.
    const key = `${item.title.trim().toLocaleLowerCase("en-US")}|${item.date}|${item.text.trim().toLocaleLowerCase("en-US")}`;
    const existing = releases.get(key);
    if (!existing) {
      releases.set(key, {
        ...item,
        listeningLinks: item.listeningLinks
          ? [...item.listeningLinks]
          : undefined,
      });
      continue;
    }
    const links = [...(existing.listeningLinks ?? [])];
    for (const link of item.listeningLinks ?? [])
      if (
        !links.some((l) => l.siteName === link.siteName && l.href === link.href)
      )
        links.push(link);
    existing.listeningLinks = links;
  }
  return orderLatestItems([
    ...other,
    ...orderLatestItems([...releases.values()]).slice(0, 3),
  ]);
}
