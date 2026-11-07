/** Public citation URLs must never contain credentials or secret query parameters. */
export function publicKnowledgeUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      [...url.searchParams.keys()].some(key => /token|secret|signature|api[-_]?key/i.test(key))
    )
      return null;
    return value;
  } catch {
    return null;
  }
}
