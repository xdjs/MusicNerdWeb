import { validateInterviewApiScope } from "@/lib/interviewApi/validateInterviewApiScope";
import type { KnowledgeToolConfig } from "@/lib/interviewApi/types";
/** Bounded private session HTTP; destination and artist come only from the host. */
export async function callInterviewApi(
  config: KnowledgeToolConfig,
  path: string,
  options: {
    body?: unknown;
    query?: Record<string, string | number>;
    signal?: AbortSignal;
  } = {},
) {
  const bound = validateInterviewApiScope(config);
  const uuid = "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}";
  if (
    !new RegExp(
      `^(?:session(?:/${uuid}/(?:offer|finish))?|answers/${uuid}|boundaries(?:/${uuid}/retract)?)$`,
      "i",
    ).test(path)
  )
    throw new Error("Invalid interview destination");
  const url = new URL(
    `/api/artist/${bound.artistId}/interview/${path}`,
    bound.apiOrigin,
  );
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (
      !/^[A-Za-z][A-Za-z0-9]*$/.test(key) ||
      !(
        typeof value === "string" ||
        (typeof value === "number" && Number.isFinite(value))
      )
    )
      throw new Error("Invalid interview query");
    url.searchParams.set(key, String(value));
  }
  if (url.search.length > 16000 || (url.search && options.body !== undefined))
    throw new Error("Invalid interview query");
  const body =
    options.body === undefined ? undefined : JSON.stringify(options.body);
  if (body && Buffer.byteLength(body) > 65536)
    throw new Error("Interview request exceeds its budget");
  const signal = AbortSignal.any([
    AbortSignal.timeout(bound.timeoutMs ?? 15000),
    ...(options.signal ? [options.signal] : []),
  ]);
  let cancel: (() => void) | undefined;
  const cancelled = new Promise<never>((_, reject) => {
    cancel = () => reject(new Error("Interview request timed out"));
    if (signal.aborted) cancel();
    else signal.addEventListener("abort", cancel, { once: true });
  });
  const run = async () => {
    signal.throwIfAborted();
    const token = await bound.getAccessToken(signal);
    signal.throwIfAborted();
    if (!token)
      throw Object.assign(new Error("Sign in to continue the interview"), {
        status: 401,
      });
    const response = await fetch(url, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body }),
      signal,
      cache: "no-store",
      redirect: "error",
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw Object.assign(
        new Error(
          response.status === 409
            ? "The interview changed. Reload the saved interview."
            : response.status === 401
              ? "Sign in to continue the interview."
              : response.status === 403
                ? "This account cannot edit this artist."
                : "Interview persistence is temporarily unavailable.",
        ),
        { status: response.status },
      );
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Interview response unavailable");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 256000)
          throw new Error("Interview response exceeds its budget");
        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  };
  try {
    return await Promise.race([run(), cancelled]);
  } finally {
    if (cancel) signal.removeEventListener("abort", cancel);
  }
}
