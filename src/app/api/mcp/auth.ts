import crypto from "crypto";
import { db } from "@/server/db/drizzle";
import { mcpApiKeys } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function validateMcpApiKey(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;

  const keyHash = hashApiKey(parts[1]);

  const rows = await db.query.mcpApiKeys.findMany({
    where: eq(mcpApiKeys.keyHash, keyHash),
  });

  const row = rows.find((r) => r.revokedAt === null);
  if (!row) return null;

  // Timing-safe comparison to prevent timing attacks
  try {
    const storedBuf = Buffer.from(row.keyHash, "utf8");
    const computedBuf = Buffer.from(keyHash, "utf8");
    if (storedBuf.length !== computedBuf.length) return null;
    if (!crypto.timingSafeEqual(storedBuf, computedBuf)) return null;
  } catch {
    return null;
  }

  return keyHash;
}
