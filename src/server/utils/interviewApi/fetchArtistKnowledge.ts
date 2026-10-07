import { validateInterviewApiScope } from "@/lib/interviewApi/validateInterviewApiScope";
import { knowledgeInputSchemas } from "@/lib/interviewApi/knowledgeSchemas";
import { knowledgeOutputSchemas } from "@/lib/interviewApi/knowledgeOutputSchemas";
import { MAX_KNOWLEDGE_BYTES } from "@/lib/interviewApi/types";
import type {
  KnowledgeResults,
  KnowledgeToolConfig,
} from "@/lib/interviewApi/types";

type Results = KnowledgeResults & {
  refresh: { status: "ok"; message: string };
};

/** One bounded authenticated HTTP call; no retries, credential redirects or raw errors. */
export async function fetchArtistKnowledge<K extends keyof Results>(
  config: KnowledgeToolConfig,
  operation: K,
  input: unknown,
  abortSignal?: AbortSignal,
): Promise<Results[K]> {
  config = validateInterviewApiScope(config);
  const validated = knowledgeInputSchemas[operation].safeParse(input);
  if (!validated.success) throw new Error("Invalid Music Nerd tool input");
  if (operation === "refresh")
    throw new Error("Research requests are disabled");
  const timeout = AbortSignal.timeout(config.timeoutMs ?? 15000);
  const signal = abortSignal
    ? AbortSignal.any([timeout, abortSignal])
    : timeout;
  let cancel: (() => void) | undefined;
  const cancelled = new Promise<never>((_, reject) => {
    cancel = () =>
      reject(new Error("Music Nerd request cancelled or timed out"));
    if (signal.aborted) cancel();
    else signal.addEventListener("abort", cancel, { once: true });
  });
  const call = async (): Promise<Results[K]> => {
    if (signal.aborted)
      throw new Error("Music Nerd request cancelled or timed out");
    const token = await config.getAccessToken(signal);
    if (signal.aborted)
      throw new Error("Music Nerd request cancelled or timed out");
    if (!token) throw new Error("Not signed in to Music Nerd");
    const path =
      operation === "read" && "sourceId" in validated.data
        ? `knowledge/sources/${encodeURIComponent(String(validated.data.sourceId))}`
        : operation === "research-status"
          ? "research/status"
          : operation === "refresh"
            ? "research/refresh"
            : `knowledge/${operation}`;
    const url = new URL(
      `/api/artist/${config.artistId}/${path}`,
      config.apiOrigin,
    );
    for (const [key, value] of Object.entries(validated.data))
      if (key !== "sourceId" && value !== undefined)
        url.searchParams.set(key, String(value));
    if (operation === "read") url.searchParams.set("includeVersion", "true");
    let response: Response;
    try {
      response = await fetch(url, {
        method: operation === "refresh" ? "POST" : "GET",
        headers: { Authorization: `Bearer ${token}` },
        signal,
        redirect: "error",
        cache: "no-store",
      });
    } catch {
      throw new Error(
        signal.aborted
          ? "Music Nerd request cancelled or timed out"
          : "Music Nerd request failed",
      );
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(
        `Music Nerd API returned HTTP ${response.status}; reload current evidence after 409, sign in after 401, and do not treat failures as empty knowledge`,
      );
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Invalid Music Nerd API response");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > MAX_KNOWLEDGE_BYTES) {
          await reader.cancel();
          throw new Error("Music Nerd API response exceeds its byte budget");
        }
        chunks.push(chunk.value);
      }
    } finally {
      reader.releaseLock();
    }
    let body: unknown;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new Error("Invalid Music Nerd API response");
    }
    const result = knowledgeOutputSchemas[operation].safeParse(body);
    if (!result.success) throw new Error("Invalid Music Nerd API response");
    if (
      operation === "read" &&
      !("version" in result.data && result.data.version)
    )
      throw new Error(
        "Invalid Music Nerd API response: source version metadata is missing",
      );
    return result.data as Results[K];
  };
  try {
    return await Promise.race([call(), cancelled]);
  } finally {
    if (cancel) signal.removeEventListener("abort", cancel);
  }
}
