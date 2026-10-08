import { z } from "zod";
import { memoryOutputSchemas } from "@/lib/interviewApi/memoryOutputSchemas";
import { assembleInterviewMemory } from "@/lib/interviewApi/assembleInterviewMemory";
import type { KnowledgeToolConfig } from "@/lib/interviewApi/types";
import type { MemoryPage } from "@/lib/interviewApi/types";
/** Host prerequisite: restore complete exact memory through the API before calling the interviewer. */
export async function fetchMandatoryInterviewMemory(
  config: KnowledgeToolConfig,
  sitting: number,
  abortSignal?: AbortSignal,
) {
  const bound = { ...config };
  const origin = new URL(bound.apiOrigin);
  if (
    origin.pathname !== "/" ||
    origin.username ||
    origin.password ||
    origin.hash ||
    origin.search ||
    !(
      origin.protocol === "https:" ||
      (origin.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname))
    ) ||
    !z.string().uuid().safeParse(bound.artistId).success ||
    !Number.isInteger(sitting) ||
    sitting < 1 ||
    sitting > 2147483647
  )
    throw new Error("Invalid Music Nerd memory scope");
  const timeout = bound.timeoutMs ?? 15000;
  if (!Number.isInteger(timeout) || timeout < 100 || timeout > 60000)
    throw new Error("Invalid Music Nerd memory deadline");
  const signal = AbortSignal.any([
    AbortSignal.timeout(timeout),
    ...(abortSignal ? [abortSignal] : []),
  ]);
  let cancel: (() => void) | undefined;
  const cancelled = new Promise<never>((_, reject) => {
    cancel = () =>
      reject(new Error("Mandatory memory request cancelled or timed out"));
    if (signal.aborted) cancel();
    else signal.addEventListener("abort", cancel, { once: true });
  });
  const run = async () => {
    const token = await bound.getAccessToken(signal);
    signal.throwIfAborted();
    if (!token) throw new Error("Not signed in to Music Nerd");
    const pages: MemoryPage[] = [];
    let cursor: string | undefined;
    let chars = 0;
    do {
      if (pages.length >= 100)
        throw new Error("Mandatory memory exceeds its page budget");
      const url = new URL(
        `/api/artist/${bound.artistId}/interview/memory`,
        origin.origin,
      );
      url.searchParams.set("sitting", String(sitting));
      url.searchParams.set("maxChars", "12000");
      if (cursor) url.searchParams.set("cursor", cursor);
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
        cache: "no-store",
        redirect: "error",
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(
          `Mandatory memory API returned HTTP ${response.status}; restart after 409, sign in after 401`,
        );
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Mandatory memory response unavailable");
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.length;
          if (bytes > 256000)
            throw new Error(
              "Mandatory memory response exceeds its byte budget",
            );
          chunks.push(value);
        }
      } finally {
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
      }
      const page = memoryOutputSchemas.page.parse(
        JSON.parse(Buffer.concat(chunks).toString("utf8")),
      );
      if (page.sitting !== sitting)
        throw new Error("Mandatory memory sitting changed");
      pages.push(page);
      chars += page.budget.returnedChars;
      if (chars > 32000 || JSON.stringify(pages).length > 96000)
        throw new Error("Mandatory memory exceeds its context budget");
      cursor = page.budget.nextCursor ?? undefined;
    } while (cursor);
    return assembleInterviewMemory(pages);
  };
  try {
    return await Promise.race([run(), cancelled]);
  } finally {
    if (cancel) signal.removeEventListener("abort", cancel);
  }
}
