import { getAccessToken } from "@privy-io/react-auth";
import { musicNerdApiUrl } from "@/lib/musicNerdApi/musicNerdApiUrl";

/** Read (GET) or start (POST) Update Latest on MusicNerdAPI with current Privy authority, without cookie-route fallback. */
export async function requestLatestRefresh(
  artistId: string,
  method: "GET" | "POST",
  signal?: AbortSignal,
): Promise<Response> {
  const token = await getAccessToken();
  if (!token) throw new Error("Sign in to update Latest.");
  return fetch(musicNerdApiUrl(`/api/artist/${artistId}/latest-refresh`), {
    method,
    headers: { Authorization: `Bearer ${token}` },
    credentials: "omit",
    cache: "no-store",
    signal,
  });
}
