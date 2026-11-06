import { createHash } from "node:crypto";

/** Fingerprint the saved vault evidence consumed by Lore; never expose its source text. */
export function vaultSourceRevision(source: {
  url: string;
  id?: string | null;
  activityId?: string | null;
  origin?: string | null;
  publication?: string | null;
  extractedText?: string | null;
  title?: string | null;
  snippet?: string | null;
  publishedAt?: string | null;
  filePath?: string | null;
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        source.url,
        source.id ?? null,
        source.activityId ?? null,
        source.origin ?? null,
        source.publication ?? null,
        source.extractedText ?? null,
        source.title ?? null,
        source.snippet ?? null,
        source.publishedAt ?? null,
        source.filePath ?? null,
      ]),
    )
    .digest("hex");
}
