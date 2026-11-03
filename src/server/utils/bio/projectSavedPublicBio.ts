import { createHash } from "node:crypto";
import { isRealBio } from "@/lib/bio/bioConstants";
import { publicKnowledgeUrl } from "@/server/utils/artistDoc/publicKnowledgeUrl";
import { vaultSourceRevision } from "@/server/utils/artistDoc/vaultSourceRevision";

/** Public text only. Legacy prose stays claim-gated; generated text keeps its original evidence and scope. */
export function projectSavedPublicBio(row: {
  bio: string | null;
  provenance: unknown;
  claimId: string | null;
  evidence: Parameters<typeof vaultSourceRevision>[0][];
}): string | null {
  if (!isRealBio(row.bio)) return null;
  if (row.provenance === null) return row.claimId ? row.bio : null;
  if (!row.provenance || typeof row.provenance !== "object") return null;
  const p = row.provenance as Record<string, unknown>;
  if (
    p.version !== 1 ||
    (typeof p.kind !== "string" || !["generated", "authored"].includes(p.kind)) ||
    typeof p.bioHash !== "string" ||
    p.bioHash !== createHash("sha256").update(row.bio!).digest("hex") ||
    (p.claimId !== null && typeof p.claimId !== "string") ||
    (p.claimId !== null && p.claimId !== row.claimId) ||
    !Array.isArray(p.sources)
  )
    return null;
  if (p.kind === "authored" && p.claimId === null) return null;
  if (p.claimId === null && !p.sources.length) return null;
  const ids = new Set<number>();
  for (const value of p.sources) {
    if (!value || typeof value !== "object") return null;
    const s = value as Record<string, unknown>;
    if (
      !Number.isSafeInteger(s.id) ||
      Number(s.id) < 1 ||
      ids.has(Number(s.id)) ||
      (typeof s.kind !== "string" || !["vault", "interview", "social"].includes(s.kind))
    )
      return null;
    ids.add(Number(s.id));
    if (s.url !== null && (typeof s.url !== "string" || !publicKnowledgeUrl(s.url))) return null;
    if (p.claimId === null && s.kind !== "vault") return null;
    if (
      s.kind === "vault" &&
      (typeof s.revision !== "string" ||
        !/^[a-f0-9]{64}$/.test(s.revision) ||
        !row.evidence.some(
          current =>
            current.url === s.url &&
            publicKnowledgeUrl(current.url) &&
            vaultSourceRevision(current) === s.revision,
        ))
    )
      return null;
  }
  return row.bio;
}
