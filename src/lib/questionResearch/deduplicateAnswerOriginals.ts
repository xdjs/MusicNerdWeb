/** Keep the first citation number for identical validated originals; retain every differing field. */
export function deduplicateAnswerOriginals<T extends { n: number }>(originals: T[]): T[] {
  const seen = new Set<string>();
  return originals.filter(original => {
    const { n: _citation, ...evidence } = original;
    const key = JSON.stringify(evidence);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
