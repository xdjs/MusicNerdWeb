import { extractQuestionUrls } from "../extractQuestionUrls";
it("keeps balanced path parentheses and query characters", () => {
  const url="https://example.org/a_(b)?next=x,y&value=1";
  expect(extractQuestionUrls(`Read (${url}).`)).toContain(url);
});
it("keeps literal punctuation endings as an option rather than corrupting real URLs", () => {
  expect(extractQuestionUrls("https://example.org/?q=hello!")).toContain("https://example.org/?q=hello!");
});
it("does not invent a URL when none was supplied", () => {
  expect(extractQuestionUrls("What does the website say?")).toEqual([]);
});
