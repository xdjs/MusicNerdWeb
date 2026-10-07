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
  expect(selectInterviewToolChoice(steps)).toEqual({
    toolChoice: { type: "tool", toolName: "checkInterviewEvidence" },
  });
  expect(
    selectInterviewToolChoice([
      ...steps,
      step("searchArtistKnowledge", { passages: [{}] }),
    ]),
  ).toBeDefined();
});
it("requires evidence proof while allowing direct exact-answer validation without unrelated research", () => {
  expect(selectInterviewToolChoice([])).toEqual({ toolChoice: "required" });
  expect(
    selectInterviewToolChoice([
      step("searchArtistKnowledge", { passages: [] }),
    ]),
  ).toEqual({ toolChoice: "required" });
  expect(
    selectInterviewToolChoice([
      step("checkInterviewEvidence", { valid: true, references: [{}] }),
    ]),
  ).toBeUndefined();
  expect(
    selectInterviewToolChoice([
      step("checkInterviewEvidence", { valid: false }),
    ]),
  ).toEqual({ toolChoice: "required" });
});
