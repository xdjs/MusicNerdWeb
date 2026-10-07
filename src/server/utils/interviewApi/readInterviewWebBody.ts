/** Bound request bytes before parsing exact interview text; never silently trim an answer. */
export async function readInterviewWebBody(request: Request) {
  const invalid = () =>
    Object.assign(new Error("Invalid interview request"), { status: 400 });
  const reader = request.body?.getReader();
  if (!reader) throw invalid();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65536) throw invalid();
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw invalid();
  }
}
