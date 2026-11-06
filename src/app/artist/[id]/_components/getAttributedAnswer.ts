export type AttributedPassage = {
  id: string;
  sourceId: string;
  revision: string;
  title: string;
  url: string;
  text: string;
  coverage: string;
  contextIncomplete: boolean;
  n: number;
  kind?: "pdf-page-text";
  originalSha256?: string;
  physicalPage?: number;
  physicalPages?: number;
  pageSha256?: string;
};
export type AttributedAnswer = {
  passages: AttributedPassage[];
  state: string;
  pdfTextUnavailable: boolean;
  /** Navigation-only projection of exactly the displayed records, never evidence. */
  navigationParts?: { type: "data-attributed-passage"; data: Record<string, unknown> }[];
};

/** Read only the versioned public passage fields; ordinary answer text stays on its existing path. */
export function getAttributedAnswer(
  message: { parts?: unknown[] } | undefined,
): AttributedAnswer | null {
  let found = false;
  let state = "partial";
  let pdfTextUnavailable = false;
  let total = 0;
  let serializedBytes = 0;
  const encoder = new TextEncoder();
  let invalid = false;
  const passages: AttributedPassage[] = [];
  const navigationParts: NonNullable<AttributedAnswer["navigationParts"]> = [];
  const ids = new Set<string>();
  for (const raw of message?.parts ?? []) {
    if (!raw || typeof raw !== "object") continue;
    const part = raw as { type?: string; data?: unknown };
    if (
      !["data-attributed-status", "data-attributed-passage"].includes(
        part.type ?? "",
      )
    )
      continue;
    found = true;
    if (!part.data || typeof part.data !== "object") {
      invalid = true;
      continue;
    }
    const p = part.data as Record<string, unknown>;
    if (p.version !== 1) {
      invalid = true;
      continue;
    }
    if (part.type === "data-attributed-status") {
      if (
        typeof p.state === "string" &&
        [
          "selecting",
          "complete-transport",
          "partial",
          "failed",
          "stopped",
          "unavailable",
        ].includes(p.state) &&
        p.selectionMayBeIncomplete === true
      )
        state = p.state;
      else invalid = true;
      pdfTextUnavailable ||= p.pdfTextUnavailable === true;
      continue;
    }
    if (
      (p.kind !== undefined && p.kind !== "pdf-page-text") ||
      typeof p.id !== "string" ||
      !/^[a-f0-9]{64}$/.test(p.id) ||
      ids.has(p.id) ||
      typeof p.sourceId !== "string" ||
      p.sourceId.length > 300 ||
      typeof p.revision !== "string" ||
      p.revision.length > 300 ||
      typeof p.title !== "string" ||
      p.title.length > 500 ||
      typeof p.url !== "string" ||
      typeof p.text !== "string" ||
      !p.text ||
      !p.text.isWellFormed() ||
      p.text.length > 6000 ||
      !["complete-read", "partial-read"].includes(String(p.coverage)) ||
      (p.contextIncomplete !== undefined &&
        typeof p.contextIncomplete !== "boolean") ||
      !Number.isSafeInteger(p.n) ||
      (p.n as number) < 1 ||
      passages.length >= 24 ||
      total + p.text.length > 12000
    ) {
      invalid = true;
      continue;
    }
    try {
      const u = new URL(p.url);
      if (
        !["http:", "https:"].includes(u.protocol) ||
        u.username ||
        u.password
      ) {
        invalid = true;
        continue;
      }
    } catch {
      invalid = true;
      continue;
    }
    const pdfFields = [
      "originalSha256",
      "physicalPage",
      "physicalPages",
      "pageSha256",
    ];
    const hasPdfMetadata =
      p.kind === "pdf-page-text" ||
      pdfFields.some((key) => p[key] !== undefined);
    if (
      hasPdfMetadata &&
      (p.kind !== "pdf-page-text" ||
        typeof p.originalSha256 !== "string" ||
        !/^[a-f0-9]{64}$/.test(p.originalSha256) ||
        typeof p.pageSha256 !== "string" ||
        !/^[a-f0-9]{64}$/.test(p.pageSha256) ||
        !Number.isSafeInteger(p.physicalPage) ||
        !Number.isSafeInteger(p.physicalPages) ||
        (p.physicalPage as number) < 1 ||
        (p.physicalPages as number) < 1 ||
        (p.physicalPages as number) > 50 ||
        (p.physicalPage as number) > (p.physicalPages as number))
    ) {
      invalid = true;
      continue;
    }
    // Count the full public data record, not just the rendered projection or
    // UTF-16 literal text. Reject a whole record; never trim source text.
    let bytes: number;
    try {
      bytes = encoder.encode(JSON.stringify(p)).byteLength;
    } catch {
      invalid = true;
      continue;
    }
    if (serializedBytes + bytes > 65536) {
      invalid = true;
      continue;
    }
    serializedBytes += bytes;
    ids.add(p.id);
    total += p.text.length;
    // Keep follow-up order tied to this acceptance point, not rejected raw parts or citation n.
    // Locators remain untrusted; the API must revalidate and reread current originals.
    const hasWindow = ["start", "end", "sha256"].some(key => Object.hasOwn(p, key));
    const validWindow =
      typeof p.start === "number" &&
      typeof p.end === "number" &&
      Number.isSafeInteger(p.start) &&
      Number.isSafeInteger(p.end) &&
      p.start >= 0 &&
      p.end > p.start &&
      p.end - p.start <= (hasPdfMetadata ? 6000 : 2400) &&
      p.end - p.start === p.text.length &&
      typeof p.sha256 === "string" &&
      /^[a-f0-9]{64}$/.test(p.sha256);
    // A malformed supplied tuple must not become a source-only/prefix read.
    // Copy only validated primitives; arbitrary values can contain old source text.
    if (
      /^[A-Za-z0-9:_-]{1,300}$/.test(p.sourceId) &&
      /^[A-Za-z0-9:._+ -]{1,300}$/.test(p.revision) &&
      (hasWindow ? validWindow : !hasPdfMetadata)
    ) {
      navigationParts.push({
        type: "data-attributed-passage",
        data: {
          version: 1,
          sourceId: p.sourceId,
          revision: p.revision,
          displayPosition: passages.length + 1,
          ...(validWindow ? { start: p.start, end: p.end, sha256: p.sha256 } : {}),
          ...(hasPdfMetadata
            ? {
                kind: "pdf-page-text",
                originalSha256: p.originalSha256 as string,
                physicalPage: p.physicalPage as number,
                physicalPages: p.physicalPages as number,
                pageSha256: p.pageSha256 as string,
              }
            : {}),
        },
      });
    }
    passages.push({
      id: p.id,
      sourceId: p.sourceId,
      revision: p.revision,
      title: p.title,
      url: p.url,
      text: p.text,
      coverage: String(p.coverage),
      // Older payloads do not establish complete surrounding context.
      contextIncomplete: p.contextIncomplete !== false,
      n: p.n as number,
      ...(hasPdfMetadata
        ? {
            kind: "pdf-page-text" as const,
            originalSha256: p.originalSha256 as string,
            physicalPage: p.physicalPage as number,
            physicalPages: p.physicalPages as number,
            pageSha256: p.pageSha256 as string,
          }
        : {}),
    });
  }
  if (invalid) state = passages.length ? "partial" : "failed";
  return found ? { passages, state, pdfTextUnavailable, navigationParts } : null;
}
