import { isDeepStrictEqual } from "node:util";
import type { KnowledgeToolConfig } from "@/lib/interviewApi/types";
import { fetchArtistKnowledge } from "./fetchArtistKnowledge";
/** Load exact prior questions through the API; older answers stay out of mandatory model context. */
export async function fetchInterviewQuestionIndex(
  config: KnowledgeToolConfig,
  abortSignal?: AbortSignal,
) {
  const signal = AbortSignal.any([
    AbortSignal.timeout(15000),
    ...(abortSignal ? [abortSignal] : []),
  ]);
  const byId = new Map<
    string,
    {
      entryId: string;
      revision: string;
      questionKey: string | null;
      answerState: string | null;
      sitting: number | null;
      question: string;
      totalChars: number;
      complete: boolean;
    }
  >();
  let cursor: string | undefined,
    bytes = 0,
    pages = 0,
    latest: unknown;
  do {
    if (pages++ >= 40)
      throw new Error("Prior interview history exceeds its page budget");
    const r = await fetchArtistKnowledge(
      config,
      "history",
      {
        kind: "answers",
        limit: 50,
        maxChars: 20000,
        ...(cursor ? { cursor } : {}),
      },
      signal,
    );
    if (pages === 1) latest = r.memory.latestAnswer;
    else if (!isDeepStrictEqual(latest, r.memory.latestAnswer))
      throw new Error("Interview history changed while reading");
    bytes += JSON.stringify(r).length;
    if (bytes > 400000)
      throw new Error("Prior interview history exceeds its response budget");
    for (const e of r.entries) {
      const field = e.fields.find((f) => f.field === "question");
      if (!field) continue;
      let record = byId.get(e.entryId);
      if (!record) {
        record = {
          entryId: e.entryId,
          revision: e.revision,
          questionKey: e.questionKey,
          answerState: e.answerState,
          sitting: e.sitting,
          question: "",
          totalChars: field.totalChars,
          complete: false,
        };
        byId.set(e.entryId, record);
      }
      if (
        record.revision !== e.revision ||
        record.question.length !== field.start ||
        record.totalChars !== field.totalChars ||
        field.text === null ||
        field.end - field.start !== field.text.length ||
        record.complete
      )
        throw new Error("Prior interview question is incomplete or changed");
      record.question += field.text;
      record.complete = field.complete;
    }
    if (JSON.stringify([...byId.values()]).length > 16000)
      throw new Error("Prior questions exceed their model context budget");
    cursor = r.budget.nextCursor ?? undefined;
  } while (cursor);
  if (
    [...byId.values()].some(
      (q) => !q.complete || q.question.length !== q.totalChars,
    )
  )
    throw new Error("Prior interview questions are incomplete");
  return [...byId.values()].map(
    ({ entryId, revision, questionKey, answerState, sitting, question }) => ({
      entryId,
      revision,
      questionKey,
      answerState,
      sitting,
      question,
    }),
  );
}
