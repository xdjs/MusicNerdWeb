import { readSourceDetails } from "../readSourceDetails";
const source = { sourceId: `latest:inprocess:${"a".repeat(64)}`, revision: "b".repeat(64) };
function page(start: number, end: number, totalChars: number) {
  return { status: "ok", passage: { ...source, start, end, text: "x".repeat(end - start), url: "https://example.com/post", curation: "approved", evidenceKind: "original_text", speaker: "unverified", publishedAt: null, retrievedAt: null, truncated: end < totalChars }, totalChars, nextStart: end < totalChars ? end : null };
}
beforeEach(() => { global.fetch = jest.fn(); });
it.each(["revision", "url", "start"])("rejects inconsistent continuation %s", async field => {
  const second = page(12000, 14000, 14000);
  Object.assign(second.passage, { [field]: field === "start" ? 11999 : field === "url" ? "https://example.com/other" : "c".repeat(64) });
  (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => page(0, 12000, 14000) }).mockResolvedValueOnce({ ok: true, json: async () => second });
  await expect(readSourceDetails("artist", source, new AbortController().signal)).rejects.toThrow();
});
it("does not download oversized records or expose partial JSON", async () => {
  (fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => page(0, 12000, 48001) });
  await expect(readSourceDetails("artist", source, new AbortController().signal)).resolves.toEqual({ text: "", url: "https://example.com/post" });
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("caps continuation reads at four pages even when the server returns small windows", async () => {
  (fetch as jest.Mock).mockImplementation(async (url: string) => {
    const start = Number(new URL(url, "https://example.com").searchParams.get("start"));
    return { ok: true, json: async () => page(start, start + 1, 100) };
  });
  await expect(readSourceDetails("artist", source, new AbortController().signal)).resolves.toEqual({ text: "", url: "https://example.com/post" });
  expect(fetch).toHaveBeenCalledTimes(4);
});
