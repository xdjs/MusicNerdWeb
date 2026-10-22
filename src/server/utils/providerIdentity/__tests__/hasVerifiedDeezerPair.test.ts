/** @jest-environment node */
const originalFetch = global.fetch;
import { hasVerifiedDeezerPair } from "../hasVerifiedDeezerPair";
const spotify = "A".repeat(22);
const row = (s = spotify, d = "87797542", entity = "Q1") => ({
  item: { value: `http://www.wikidata.org/entity/${entity}` },
  sourceId: { value: s },
  targetId: { value: d },
});
const respond = (bindings: unknown[]) =>
  Object.assign(global, { fetch:
    jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: { bindings } }),
    }) });
afterEach(() => { global.fetch = originalFetch; });
describe("exact Wikidata provider pair", () => {
  it("accepts an uncontested exact pair without imposing display-name equality (synthetic alias)", async () => {
    respond([row()]);
    expect(await hasVerifiedDeezerPair(spotify, "87797542")).toBe(true);
  });
  it.each([
    [],
    [row(spotify, "123")],
    [row("B".repeat(22))],
    [row(), row(spotify, "123")],
    [row(), row(spotify, "87797542", "Q2")],
    [{}],
    Array(11).fill(row()),
  ].map(bindings => ({ bindings })))("rejects missing, conflicting, malformed or truncated evidence %#", async ({ bindings }) => {
    respond(bindings);
    expect(await hasVerifiedDeezerPair(spotify, "87797542")).toBe(false);
  });
  it("fails closed on lookup failure", async () => {
    Object.assign(global, { fetch: jest.fn().mockRejectedValue(new Error("offline")) });
    expect(await hasVerifiedDeezerPair(spotify, "87797542")).toBe(false);
  });
  it("does not request evidence without valid exact IDs", async () => {
    const fetch = jest.fn();
    Object.assign(global, { fetch });
    expect(await hasVerifiedDeezerPair(null, "87797542")).toBe(false);
    expect(await hasVerifiedDeezerPair(spotify, "../search")).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});
