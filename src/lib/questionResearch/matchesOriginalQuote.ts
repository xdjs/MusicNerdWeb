/** Allow only collapsed whitespace in a contiguous quote; retain the original passage and offsets. */
export function matchesOriginalQuote(original: string, quote: string): boolean {
  const candidate = quote.trim();
  if (!candidate) return false;
  const collapse = (value: string) => value.replace(/\s+/gu, " ");
  return collapse(original).includes(collapse(candidate));
}
