/** Preserve literal URLs; also admit their prose-delimited spelling, without rewriting paths or queries. */
export function extractQuestionUrls(question: string): string[] {
  const urls = new Set<string>();
  for (const literal of question.match(/https?:\/\/[^\s<>"']+/gi) ?? []) {
    urls.add(literal);
    let cleaned = literal.replace(/[.,;:!?]+$/, "");
    for (const [open, close] of [["(", ")"], ["[", "]"], ["{", "}"]]) {
      while (cleaned.endsWith(close) && cleaned.split(close).length > cleaned.split(open).length)
        cleaned = cleaned.slice(0, -1);
    }
    cleaned = cleaned.replace(/[.,;:!?]+$/, "");
    urls.add(cleaned);
  }
  return [...urls];
}
