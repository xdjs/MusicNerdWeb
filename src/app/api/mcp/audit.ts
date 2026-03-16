import { db } from "@/server/db/drizzle";
import { mcpAuditLog } from "@/server/db/schema";

type AuditEntry = {
  artistId: string;
  field: string;
  action: "set" | "delete" | "resolve" | "exclude";
  submittedUrl?: string;
  oldValue?: string | null;
  newValue?: string | null;
  apiKeyHash: string;
};

function toRow(entry: AuditEntry) {
  return {
    artistId: entry.artistId,
    field: entry.field,
    action: entry.action,
    submittedUrl: entry.submittedUrl ?? null,
    oldValue: entry.oldValue ?? null,
    newValue: entry.newValue ?? null,
    apiKeyHash: entry.apiKeyHash,
  };
}

export async function logMcpAudit(entryOrEntries: AuditEntry | AuditEntry[]): Promise<void> {
  const entries = Array.isArray(entryOrEntries) ? entryOrEntries : [entryOrEntries];
  if (entries.length === 0) return;
  await db.insert(mcpAuditLog).values(entries.map(toRow));
}
