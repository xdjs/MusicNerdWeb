import { parseArtistEntry } from "../parseArtistEntry";
const names = ["LATASHÁ", "Dutchyyy"];
it.each(["LATASHA", "latashá", "  LATASHA  ", "Lat", "LATASHÁ!"])("opens %s without a paid name-only question", (query) => {
  expect(parseArtistEntry(query, names)).toEqual({ matches: ["LATASHÁ"], intent: undefined });
});
it("treats whitespace as an empty search", () => {
  expect(parseArtistEntry("   ", names)).toEqual({ matches: names, intent: undefined });
});
it.each(["Dutchyyy’s approach to improvisation", "How did LATASHA become independent?"])("carries the full question: %s", (query) => {
  expect(parseArtistEntry(query, names).intent).toBe(query);
  expect(parseArtistEntry(query, names).matches).toHaveLength(1);
});
it("requires an explicit artist choice for a two-artist question", () => {
  expect(parseArtistEntry("Compare LATASHA and Dutchyyy", names).matches).toEqual(names);
});
it.each(["Dutchyy’s music", "notlatasha", "Beyonce", "Dutchyyyy"])("does not silently guess %s", (query) => {
  expect(parseArtistEntry(query, names).matches).toEqual([]);
});
