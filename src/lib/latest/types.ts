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
};
export type LatestRefreshState = {
  claimId: string | null;
  userId: string;
  instagram?: string;
  inprocess?: string;
  spotify?: string;
  deezer?: string;
  sources: Record<LatestSource, SourceResult>;
  providerStarted?: boolean;
  runId?: string;
  datasetId?: string;
};
export type LatestRefreshView = {
  id: string;
  status: string;
  requestedAt: string;
  sources: Partial<Record<LatestSource, SourceResult>>;
  retryAt: string;
};
