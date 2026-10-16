import { createHash } from "node:crypto";
import type { Artist } from "@/server/db/DbTypes";
import type { ArtistLink } from "@/server/utils/queries/artistQueries";
import { getProfileLinks } from "@/lib/artist/artistProfileLinks";
import { getSourceLinks } from "@/lib/musicLinks/getSourceLinks";

type Source = Parameters<typeof getSourceLinks>[0][number] & {
  filePath?: string | null;
};
/** Fingerprint public destinations only; private source/narrative changes are invisible. */
export function publicLinkRevision(
  artist: Pick<Artist, "spotify" | "deezer">,
  links: ArtistLink[],
  sources: Source[],
  blockedIds: string[],
): string {
  const profileLinks = [
    ...getProfileLinks(artist, links, "links"),
    ...getProfileLinks(artist, links, "support"),
  ];
  const visible = sources.filter(
    (source) => !source.filePath && !blockedIds.includes(source.id),
  );
  const destinations = [
    ...profileLinks,
    ...getSourceLinks(visible, profileLinks, "links"),
    ...getSourceLinks(visible, profileLinks, "support"),
  ]
    .map(({ siteName, href }) => [siteName, href])
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return createHash("sha256")
    .update(JSON.stringify(destinations))
    .digest("hex");
}
