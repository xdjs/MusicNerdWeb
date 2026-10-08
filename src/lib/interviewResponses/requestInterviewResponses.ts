import { getAccessToken } from "@privy-io/react-auth";
import { z } from "zod";
import { musicNerdApiUrl } from "@/lib/musicNerdApi/musicNerdApiUrl";

/** Read or revise interview responses through the shared API with current account credentials. */
export async function requestInterviewResponses<T>(
  artistId: string,
  suffix: string,
  schema: z.ZodType<T>,
  options: {
    signal?: AbortSignal;
    body?: { expectedRevision: string; answer: string; note: string };
  } = {},
): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new Error("Sign in again to review your interviews.");
  const response = await fetch(
    musicNerdApiUrl(
      `/api/artist/${encodeURIComponent(artistId)}/interview/responses${suffix}`,
    ),
    {
      method: options.body ? "PATCH" : "GET",
      cache: "no-store",
      signal: options.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    },
  );
  if (!response.ok) {
    const messages: Record<number, string> = {
      401: "Sign in again to review your interviews.",
      403: "Your access to this artist has changed.",
      404: "This saved response is no longer available.",
      409: "This response changed. Read the latest saved response before saving again.",
      400: "This view has changed. Reload the interviews and try again.",
      413: "This response history is too large to open here.",
    };
    throw Object.assign(
      new Error(
        messages[response.status] ??
          "Interviews are temporarily unavailable. Your draft has not been discarded.",
      ),
      { status: response.status },
    );
  }
  const parsed = schema.safeParse(await response.json());
  if (!parsed.success)
    throw new Error("The saved response could not be read. Please try again.");
  return parsed.data;
}
