import crypto from "crypto";
import { db } from "@/server/db/drizzle";
import { mcpApiKeys } from "@/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function validateMcpApiKey(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") return null;

  const keyHash = hashApiKey(parts[1]);

  // The SHA-256 prehash makes direct DB lookup safe — timing information from
  // the query only reveals whether a hash exists, not anything about the original key.
  const row = await db.query.mcpApiKeys.findFirst({
    where: and(eq(mcpApiKeys.keyHash, keyHash), isNull(mcpApiKeys.revokedAt)),
  });

  return row ? keyHash : null;
}
