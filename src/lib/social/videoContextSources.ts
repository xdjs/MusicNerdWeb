import type { SocialPostRow } from "@/server/utils/socialSignals";

/** Bounds audio context independently of caption quotes and preserves original post citations. */
export function videoContextSources(
  posts: SocialPostRow[],
): { url: string; text: string; postedAt: string }[] {
  return posts
    .filter(p => p.platform === "instagram" && p.isOwnPost && p.transcript?.trim())
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt))
    .slice(0, 12)
    .map(p => ({ url: p.url, text: p.transcript!.slice(0, 4000), postedAt: p.postedAt }));
}
