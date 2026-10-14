import { getStructuredQuoteTexts } from "./getStructuredQuoteTexts";

/** Match contiguous original wording; JSON escaping is representation, not source wording. */
export function matchesOriginalQuote(original: string, quote: string, structuredRecord = false): boolean {
  const candidate = quote.trim();
  if (!candidate) return false;
  const collapse = (value: string) => value.replace(/\s+/gu, " ");
  const texts = structuredRecord ? [original, ...getStructuredQuoteTexts(original)] : [original];
  return texts.some(text => collapse(text).includes(collapse(candidate)));
}
