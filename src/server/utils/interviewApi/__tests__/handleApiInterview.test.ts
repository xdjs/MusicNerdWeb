/** @jest-environment node */
import { ReadableStream } from "node:stream/web";
import { handleApiInterview } from "../handleApiInterview";
import { callInterviewApi } from "../callInterviewApi";
import { generateApiInterviewQuestion } from "../generateApiInterviewQuestion";
jest.mock("@/env", () => ({ MUSICNERD_API_INTERVIEWER_ENABLED: true }));
jest.mock("../callInterviewApi", () => ({ callInterviewApi: jest.fn() }));
jest.mock("../generateApiInterviewQuestion", () => ({
  generateApiInterviewQuestion: jest.fn(),
}));
jest.mock("../fetchMandatoryInterviewMemory", () => ({
  fetchMandatoryInterviewMemory: jest.fn(),
}));
jest.mock("../fetchArtistKnowledge", () => ({
  fetchArtistKnowledge: jest.fn(),
}));
if (!Response.json)
  Response.json = (body, init) =>
    new Response(JSON.stringify(body), {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
const artistId = "11111111-1111-4111-8111-111111111111",
  sessionId = "22222222-2222-4222-8222-222222222222";
const state = {
  status: "ok",
  session: {
    id: sessionId,
    sitting: 1,
    state: "active",
    createdAt: "2026-10-06",
    closedAt: null,
    questions: [],
  },
  legacyOffers: [],
};
const request = (body?: unknown) => {
  const r = new Request("https://web.example/api/interview", {
    method: body ? "POST" : "GET",
    headers: { Authorization: "Bearer token" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  Object.defineProperty(r, "signal", { value: new AbortController().signal });
  if (body)
    Object.defineProperty(r, "body", {
      value: new ReadableStream({
        start(c) {
          c.enqueue(Buffer.from(JSON.stringify(body)));
          c.close();
        },
      }),
    });
  return r;
};
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(callInterviewApi).mockResolvedValue(state);
  jest
    .mocked(generateApiInterviewQuestion)
    .mockResolvedValue({
      question: "What do you think led to that sound?",
      memorySnapshotId: "a".repeat(64),
      references: [],
      sitting: 1,
    } as never);
});
it("restores state on GET without starting or generating anything", async () => {
  expect((await handleApiInterview(request(), artistId)).status).toBe(200);
  expect(callInterviewApi).toHaveBeenCalledWith(
    expect.anything(),
    "session",
    expect.anything(),
  );
  expect(generateApiInterviewQuestion).not.toHaveBeenCalled();
});
it("denies missing authentication before generation or API reads", async () => {
  expect(
    (await handleApiInterview(new Request("https://web.example"), artistId))
      .status,
  ).toBe(401);
  expect(callInterviewApi).not.toHaveBeenCalled();
  expect(generateApiInterviewQuestion).not.toHaveBeenCalled();
});
it("starts explicitly, generates from the durable sitting and submits its exact memory snapshot", async () => {
  await handleApiInterview(
    request({ action: "start", requestId: sessionId }),
    artistId,
  );
  expect(generateApiInterviewQuestion).toHaveBeenCalledWith(
    expect.objectContaining({ artistId }),
    1,
    expect.anything(),
  );
  expect(callInterviewApi).toHaveBeenCalledWith(
    expect.anything(),
    `session/${sessionId}/offer`,
    expect.objectContaining({
      body: {
        ordinal: 1,
        question: "What do you think led to that sound?",
        memorySnapshotId: "a".repeat(64),
        references: [],
      },
    }),
  );
});
it("returns an already-offered question on Continue instead of regenerating it", async () => {
  jest
    .mocked(callInterviewApi)
    .mockResolvedValue({
      ...state,
      session: {
        ...state.session,
        questions: [
          {
            id: artistId,
            sitting: 1,
            questionKey: "key",
            question: "An existing question?",
            answer: null,
            state: "offered",
            revision: "a".repeat(64),
            offeredAt: "2026-10-06",
            answerUpdatedAt: "2026-10-06",
            ordinal: 1,
            references: [],
          },
        ],
      },
    });
  expect(
    (
      await handleApiInterview(
        request({ action: "continue", sessionId }),
        artistId,
      )
    ).status,
  ).toBe(200);
  expect(generateApiInterviewQuestion).not.toHaveBeenCalled();
});
it("rejects model-chosen scope, answer injection and raw generation failures", async () => {
  expect(
    (
      await handleApiInterview(
        request({
          action: "start",
          requestId: sessionId,
          apiOrigin: "https://attacker.example",
        }),
        artistId,
      )
    ).status,
  ).toBe(400);
  jest
    .mocked(generateApiInterviewQuestion)
    .mockRejectedValue(new Error("PRIVATE ORIGINAL"));
  const r = await handleApiInterview(
    request({ action: "continue", sessionId }),
    artistId,
  );
  expect(r.status).toBe(503);
  expect(await r.text()).not.toContain("PRIVATE ORIGINAL");
});
