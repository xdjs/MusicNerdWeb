import { db } from "@/server/db/drizzle";
import { mcpApiKeys } from "@/server/db/schema";
import { desc } from "drizzle-orm";

export async function getAllMcpKeys() {
  const keys = await db
    .select({
      id: mcpApiKeys.id,
      label: mcpApiKeys.label,
      keyHash: mcpApiKeys.keyHash,
      createdAt: mcpApiKeys.createdAt,
      revokedAt: mcpApiKeys.revokedAt,
    })
    .from(mcpApiKeys)
    .orderBy(desc(mcpApiKeys.createdAt));

  // Only expose first 8 chars of hash for identification
  return keys.map((k) => ({
    id: k.id,
    label: k.label,
    keyHashPrefix: k.keyHash.slice(0, 8),
    createdAt: k.createdAt,
    revokedAt: k.revokedAt,
  }));
}
