/** @jest-environment node */
import { fetchInterviewQuestionIndex } from "../fetchInterviewQuestionIndex";
import { fetchArtistKnowledge } from "../fetchArtistKnowledge";
jest.mock("../fetchArtistKnowledge", () => ({
  fetchArtistKnowledge: jest.fn(),
}));
const config = {
  apiOrigin: "https://api.example",
  artistId: "11111111-1111-4111-8111-111111111111",
  getAccessToken: async () => "private-token",
};
const entry = {
  entryId: "answer:1",
  revision: "a".repeat(64),
  questionKey: "q",
  answerState: "skipped",
  sitting: 1,
};
function page(text: string, start: number, nextCursor: string | null) {
  return {
    status: "ok",
    entries: [
      {
        ...entry,
        fields: [
          {
            field: "question",
            text,
            start,
            end: start + text.length,
            totalChars: 12,
            complete: start + text.length === 12,
          },
        ],
      },
    ],
    memory: { latestAnswer: null },
    budget: { returnedChars: text.length, truncated: !!nextCursor, nextCursor },
  };
}
it("reconstructs exact previous questions across pages without treating skips as boundaries", async () => {
  jest
    .mocked(fetchArtistKnowledge)
    .mockResolvedValueOnce(page("How did ", 0, "next") as never)
    .mockResolvedValueOnce(page("you?", 8, null) as never);
  expect(await fetchInterviewQuestionIndex(config)).toEqual([
    {
      entryId: "answer:1",
      revision: entry.revision,
      questionKey: "q",
      answerState: "skipped",
      sitting: 1,
      question: "How did you?",
    },
  ]);
});
it("fails on a missing field continuation instead of forgetting previous questions", async () => {
  jest
    .mocked(fetchArtistKnowledge)
    .mockResolvedValueOnce(page("How did ", 0, null) as never);
  await expect(fetchInterviewQuestionIndex(config)).rejects.toThrow(
    /incomplete/,
  );
});
