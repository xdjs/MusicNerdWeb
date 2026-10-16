import { buildQuestionPlanningEvidence } from "../buildQuestionPlanningEvidence";
import type { QuestionReuseCandidate } from "../reuseTypes";
const passage = {
  text: "A complete original sentence about a particular recording.",
  url: "https://artist.example/interview",
  evidenceKind: "original_text",
};
const first: QuestionReuseCandidate = {
  id: "first",
  jobId: "first-job",
  questionHash: "hash",
  intent: "A recording question",
  routing: { topic: "Recording" },
  answer: "A checked answer.",
  passages: [passage],
};
it("shares an identical complete passage while preserving each candidate association", () => {
  const second = {
    ...first,
    id: "second",
    answer: "Another checked answer.",
    passages: [{ ...passage }],
  };
  const result = buildQuestionPlanningEvidence([first, second]);
  expect(result.originals).toEqual([{ id: "original-1", ...passage }]);
  expect(result.candidates).toEqual([
    { ...first, passages: undefined, passageIds: ["original-1"] },
    { ...second, passages: undefined, passageIds: ["original-1"] },
  ]);
  expect(first.passages).toEqual([passage]);
});
it("does not combine different URLs, evidence kinds or unequal windows", () => {
  const passages = [
    passage,
    { ...passage, url: "https://other.example/interview" },
    { ...passage, evidenceKind: "caption" },
    { ...passage, text: passage.text + " A qualification follows." },
  ];
  const result = buildQuestionPlanningEvidence([{ ...first, passages }]);
  expect(result.originals).toEqual(
    passages.map((p, i) => ({ id: `original-${i + 1}`, ...p })),
  );
  expect(result.candidates[0].passageIds).toEqual([
    "original-1",
    "original-2",
    "original-3",
    "original-4",
  ]);
});
it("keeps every character of a long cited window and includes no extra evidence", () => {
  const text =
    "Navigation. ".repeat(100) +
    "Their influence was Lila. This applies only to the music video.";
  const result = buildQuestionPlanningEvidence([
    { ...first, passages: [{ ...passage, text }] },
    { ...first, id: "second", passages: [{ ...passage, text }] },
  ]);
  expect(result.originals.map((p) => p.text).join("")).toBe(text);
});
