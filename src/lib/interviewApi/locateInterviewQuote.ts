/** Resolve only exact words: tolerate copied whitespace/quote typography, then retain the actual original span. */
export function locateInterviewQuote(text: string, requested: string) {
  const fail = () => new Error("Interview quote is missing or ambiguous");
  const exact = text.indexOf(requested);
  if (exact >= 0) {
    if (text.indexOf(requested, exact + 1) >= 0) throw fail();
    return { start: exact, end: exact + requested.length, quote: requested };
  }
  const normalize = (value: string) => {
    let normalized = "";
    const spans: Array<{ start: number; end: number }> = [];
    for (let i = 0; i < value.length; i++) {
      const c = value[i];
      const mapped = /\s/u.test(c)
        ? " "
        : /[‘’]/u.test(c)
          ? "'"
          : /[“”]/u.test(c)
            ? '"'
            : c;
      if (mapped === " " && normalized.endsWith(" "))
        spans[spans.length - 1].end = i + 1;
      else {
        normalized += mapped;
        spans.push({ start: i, end: i + 1 });
      }
    }
    return { normalized, spans };
  };
  const haystack = normalize(text),
    needle = normalize(requested).normalized.trim();
  const offset = haystack.normalized.indexOf(needle);
  if (
    !needle ||
    offset < 0 ||
    haystack.normalized.indexOf(needle, offset + 1) >= 0
  )
    throw fail();
  const start = haystack.spans[offset].start,
    end = haystack.spans[offset + needle.length - 1].end;
  return { start, end, quote: text.slice(start, end) };
}
