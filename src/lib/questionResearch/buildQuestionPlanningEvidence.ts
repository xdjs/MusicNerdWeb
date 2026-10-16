import type { QuestionReuseCandidate } from "./reuseTypes";

/** Share byte-identical public evidence without cutting context or changing candidate ownership. */
export function buildQuestionPlanningEvidence(
  candidates: QuestionReuseCandidate[],
) {
  const ids = new Map<string, string>();
  const originals: (QuestionReuseCandidate["passages"][number] & {
    id: string;
  })[] = [];
  const compact = candidates.map(({ passages, ...candidate }) => ({
    ...candidate,
    passageIds: passages.map((passage) => {
      const key = JSON.stringify([
        passage.url,
        passage.evidenceKind,
        passage.text,
      ]);
      let id = ids.get(key);
      if (!id) {
        id = `original-${originals.length + 1}`;
        ids.set(key, id);
        originals.push({ id, ...passage });
      }
      return id;
    }),
  }));
  return { candidates: compact, originals };
}
