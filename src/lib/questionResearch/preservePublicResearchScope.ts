/** Preserve declared neutral scope without copying chat or truncating the API topic. */
export function preservePublicResearchScope(topic: string, constraints: string[]): string | null {
  let result = topic.trim();
  const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
  for (const constraint of constraints) {
    const scope = constraint.trim();
    const literal = normalize(scope).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Whole text boundaries avoid treating Ann as already present in Annette.
    if (scope && !new RegExp(`(?<![\\p{L}\\p{N}])${literal}(?![\\p{L}\\p{N}])`, "u").test(normalize(result)))
      result += `; ${scope}`;
  }
  return result.length <= 160 ? result : null;
}
