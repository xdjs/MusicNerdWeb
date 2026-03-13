import { db } from "@/server/db/drizzle";
import { mcpAuditLog } from "@/server/db/schema";

export async function logMcpAudit(entry: {
  artistId: string;
  field: string;
  action: "set" | "delete" | "resolve";
  submittedUrl?: string;
  oldValue?: string | null;
  newValue?: string | null;
  apiKeyHash: string;
}): Promise<void> {
  await db.insert(mcpAuditLog).values({
    artistId: entry.artistId,
    field: entry.field,
    action: entry.action,
    submittedUrl: entry.submittedUrl ?? null,
    oldValue: entry.oldValue ?? null,
    newValue: entry.newValue ?? null,
    apiKeyHash: entry.apiKeyHash,
  });
}
