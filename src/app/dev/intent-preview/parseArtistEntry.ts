/** Resolve only the connected artists; preserve a real question for the workspace. */
export function parseArtistEntry(query: string, names: string[]) {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  const normalized = normalize(query);
  const tokens: string[] = normalized.match(/[a-z0-9]+/g) ?? [];
  const matches = names.filter((name) => {
    const artist = normalize(name);
    return !normalized || tokens.includes(artist) || artist.startsWith(normalized);
  });
  const nameOnly =
    matches.length === 1 &&
    (normalize(matches[0]).startsWith(normalized) ||
      (tokens.length === 1 && tokens[0] === normalize(matches[0])));
  return { matches, intent: !normalized || nameOnly ? undefined : query.trim() };
}
