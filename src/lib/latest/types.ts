export const LATEST_SOURCES = [
  "instagram",
  "inprocess",
  "spotify",
  "deezer",
  "interviews",
] as const;
export type LatestSource = (typeof LATEST_SOURCES)[number];
export const LATEST_SOURCE_LABELS: Record<LatestSource, string> = {
  instagram: "Instagram",
  inprocess: "In Process",
  spotify: "Spotify releases",
  deezer: "Deezer releases",
  interviews: "Published answers",
};
export type SourceResult = {
  status: "pending" | "checked" | "failed" | "disconnected";
  checkedAt?: string;
  detail?: "posts_imported" | "older_posts_found" | "no_new_posts" | "instagram_unavailable" | "verifying_empty_window";
};
export type LatestRefreshView = {
  id: string;
  status: string;
  requestedAt: string;
  sources: Partial<Record<LatestSource, SourceResult>>;
  retryAt: string;
};
