import { getAccessToken } from "@privy-io/react-auth";
import { musicNerdApiUrl } from "@/lib/musicNerdApi/musicNerdApiUrl";
/** Artist-only client call: uses current Privy authority, never the public research service key. */
export async function callPrivateResearch(
  path: string,
  options: { body?: unknown; signal?: AbortSignal } = {},
) {
  const token = await getAccessToken();
  if (!token) throw new Error("Please sign in again to review discoveries.");
  options.signal?.throwIfAborted();
  const r = await fetch(musicNerdApiUrl(path), {
    method: options.body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    signal: options.signal,
    cache: "no-store",
    redirect: "error",
  });
  if (!r.ok)
    throw new Error(
      r.status === 409
        ? "This source or decision changed. Reload discoveries before reviewing."
        : r.status === 403
          ? "Only the current artist owner or an administrator can review this."
          : r.status === 401
            ? "Please sign in again to review discoveries."
            : "Discoveries are temporarily unavailable. Try again.",
    );
  return r.json() as Promise<unknown>;
}
