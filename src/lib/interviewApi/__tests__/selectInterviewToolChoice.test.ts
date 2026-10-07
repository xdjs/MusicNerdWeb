import { selectInterviewToolChoice } from "../selectInterviewToolChoice";
const step = (toolName: string, output: unknown) => ({
  toolResults: [{ toolName, output }],
});
it("requires an original read after discovery before allowing an angle", () => {
  expect(
    selectInterviewToolChoice([
      step("searchArtistKnowledge", { passages: [{ text: "Search excerpt" }] }),
    ]),
  ).toEqual({ toolChoice: { type: "tool", toolName: "readArtistSource" } });
  expect(
    selectInterviewToolChoice([
      step("listArtistSources", {
        sources: [{ extraction: { readiness: "ready" } }],
      }),
    ]),
  ).toEqual({ toolChoice: { type: "tool", toolName: "readArtistSource" } });
});
it("permits synthesis after an original read and requires a new read after a new search", () => {
  const steps = [
    step("searchArtistKnowledge", { passages: [{}] }),
    step("readArtistSource", { passage: { text: "Full source context" } }),
  ];
  expect(selectInterviewToolChoice(steps)).toBeUndefined();
  expect(
    selectInterviewToolChoice([
      ...steps,
      step("searchArtistKnowledge", { passages: [{}] }),
    ]),
  ).toBeDefined();
});
it("does not force unrelated research for an exact-answer follow-up or a search with no hits", () => {
  expect(selectInterviewToolChoice([])).toBeUndefined();
  expect(
    selectInterviewToolChoice([
      step("searchArtistKnowledge", { passages: [] }),
    ]),
  ).toBeUndefined();
});
