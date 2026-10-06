import { MUSICNERD_API_URL } from "@/lib/musicNerdApi/const";
import { MUSICNERD_RESEARCH_API_KEY } from "@/env";
/** Server-only public research capability. No private artist token or arbitrary destination. */
export async function callResearchApi(
  path: string,
  options: { body?: unknown; signal?: AbortSignal } = {},
): Promise<unknown> {
  if (!MUSICNERD_RESEARCH_API_KEY || MUSICNERD_RESEARCH_API_KEY.length < 32)
    throw new Error("Research is not configured");
  const origin = new URL(MUSICNERD_API_URL);
  if (
    origin.pathname !== "/" ||
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash ||
    !(
      origin.protocol === "https:" ||
      (origin.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(origin.hostname))
    ) ||
    !/^\/api\/(?:artist\/[0-9a-f-]+\/research\/|research\/advance$)/i.test(
      path,
    ) ||
    path.includes("..")
  )
    throw new Error("Invalid research destination");
  const response = await fetch(new URL(path, origin), {
    method: options.body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      "X-MusicNerd-Research-Key": MUSICNERD_RESEARCH_API_KEY,
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    signal: AbortSignal.any([
      AbortSignal.timeout(55000),
      ...(options.signal ? [options.signal] : []),
    ]),
    cache: "no-store",
    redirect: "error",
  });
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Research response unavailable");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 512000) throw new Error("Research response too large");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  if (!response.ok) {
    const error = new Error(
      response.status === 429
        ? "The research limit has been reached. Try again later."
        : response.status === 409
          ? "The source changed. Reload the research before continuing."
          : "Research is temporarily unavailable.",
    );
    Object.assign(error, { status: response.status });
    throw error;
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
