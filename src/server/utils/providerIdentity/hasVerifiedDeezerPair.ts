/** Verify an exact catalog pair through unique Wikidata ownership, independently of names. */
export async function hasVerifiedDeezerPair(
  spotifyId: string | null | undefined,
  deezerId: string,
): Promise<boolean> {
  if (!spotifyId || !/^[A-Za-z0-9]{22}$/.test(spotifyId) || !/^[1-9]\d*$/.test(deezerId))
    return false;
  // Inspect owners of BOTH IDs, including every other ID on those entities.
  // A bounded/truncated result is never enough evidence to attach.
  const query = `SELECT DISTINCT ?item ?sourceId ?targetId WHERE {
    { ?item wdt:P1902 "${spotifyId}" } UNION { ?item wdt:P2722 "${deezerId}" }
    OPTIONAL { ?item wdt:P1902 ?sourceId }
    OPTIONAL { ?item wdt:P2722 ?targetId }
  } LIMIT 11`;
  try {
    const response = await fetch("https://query.wikidata.org/sparql", {
      method: "POST",
      headers: {
        Accept: "application/sparql-results+json",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "MusicNerdWeb/1.0 (https://musicnerd.net)",
      },
      body: new URLSearchParams({ query }).toString(),
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    if (!response.ok) return false;
    const data = await response.json();
    const rows: unknown = data?.results?.bindings;
    if (!Array.isArray(rows) || rows.length === 0 || rows.length >= 11) return false;
    const entities = new Set<string>();
    for (const row of rows) {
      const entity = row?.item?.value;
      if (
        typeof entity !== "string" ||
        !/^https?:\/\/www\.wikidata\.org\/entity\/Q[1-9]\d*$/.test(entity) ||
        row?.sourceId?.value !== spotifyId ||
        row?.targetId?.value !== deezerId
      )
        return false;
      entities.add(entity.replace(/^http:/, "https:"));
    }
    return entities.size === 1;
  } catch {
    return false;
  }
}
