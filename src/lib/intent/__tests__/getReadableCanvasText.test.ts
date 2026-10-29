import { getReadableCanvasText } from "../getReadableCanvasText";
describe("getReadableCanvasText", () => {
  it("hides legacy storage payloads and navigation without pretending to rewrite evidence", () => {
    expect(
      getReadableCanvasText(
        '{ "provider": "deezer", "title": "Salsa System" }',
      ),
    ).toBe("");
    expect(
      getReadableCanvasText(
        "0 Skip to Content English English View fullsize 2022 Photos",
      ),
    ).toBe("");
  });
  it("retains new labeled metadata, actual PDF passages and ordinary prose", () => {
    for (const text of [
      "Title: Salsa System · Type: EP · Release date: 2006-01-01",
      "In June 2023, he released the series.",
      "English folk music shaped the album.",
      "[Verse] This is artist-written text.",
    ])
      expect(getReadableCanvasText(text)).toBe(text);
  });
});
