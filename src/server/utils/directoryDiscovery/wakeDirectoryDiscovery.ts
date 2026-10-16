import { musicNerdApiUrl } from "@/lib/musicNerdApi/musicNerdApiUrl";

/** Best-effort wake of committed work; the durable queue/cron owns recovery. */
export async function wakeDirectoryDiscovery(
  artistId: string,
): Promise<boolean> {
  try {
    const response = await fetch(musicNerdApiUrl("/api/research/advance"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artistId, kinds: ["source_search"] }),
      cache: "no-store",
      signal: AbortSignal.timeout(58_000),
    });
    if (!response.ok) return false;
    const result: unknown = await response.json();
    return (
      !!result &&
      typeof result === "object" &&
      "status" in result &&
      result.status === "ok" &&
      "ran" in result &&
      result.ran === true
    );
  } catch {
    // No provider payloads or credentials in logs; failure never changes creation.
    return false;
  }
}
