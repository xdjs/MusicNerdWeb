import { locateInterviewQuote } from "../locateInterviewQuote";
it("returns the original UTF-16 span despite typography or paragraph-spacing copying differences", () => {
  const original = "🥁 “I’m just everything.”\n\n“And that’s the music.”";
  expect(
    locateInterviewQuote(
      original,
      '"I\'m just everything." "And that\'s the music."',
    ),
  ).toEqual({ start: 3, end: original.length, quote: original.slice(3) });
});
it("rejects changed words, omitted qualifications, and stitched passages", () => {
  expect(() =>
    locateInterviewQuote("I did not produce it.", "I did produce it."),
  ).toThrow();
  expect(() =>
    locateInterviewQuote(
      "First phrase. A qualification. Last phrase.",
      "First phrase. Last phrase.",
    ),
  ).toThrow();
});
it("rejects ambiguous typography-normalized matches", () => {
  expect(() =>
    locateInterviewQuote("I’m ready. I’m ready.", "I'm ready."),
  ).toThrow();
});
it("prefers an already exact unique passage and returns its original words", () => {
  expect(
    locateInterviewQuote("A unique phrase. Another one.", "unique phrase"),
  ).toEqual({ start: 2, end: 15, quote: "unique phrase" });
});
