/** @jest-environment node */
import { ReadableStream } from "node:stream/web";
import { handleApiInterview } from "../handleApiInterview";
import { callInterviewApi } from "../callInterviewApi";
import { generateApiInterviewQuestion } from "../generateApiInterviewQuestion";
import { fetchMandatoryInterviewMemory } from "../fetchMandatoryInterviewMemory";
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
  jest.mocked(generateApiInterviewQuestion).mockResolvedValue({
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
it("lists management pages even when mandatory model memory cannot be assembled", async () => {
  const page = { status: "ok", sitting: 1, boundaries: [], nextCursor: null };
  jest
    .mocked(fetchMandatoryInterviewMemory)
    .mockRejectedValue(
      new Error("Mandatory memory exceeds its context budget"),
    );
  jest
    .mocked(callInterviewApi)
    .mockResolvedValueOnce(state)
    .mockResolvedValueOnce(page);
  const result = await handleApiInterview(
    request({ action: "boundaries", cursor: "next" }),
    artistId,
  );
  expect(result.status).toBe(200);
  expect(await result.json()).toEqual(page);
  expect(callInterviewApi).toHaveBeenLastCalledWith(
    expect.anything(),
    "boundaries",
    expect.objectContaining({ query: { sitting: 1, cursor: "next" } }),
  );
  expect(fetchMandatoryInterviewMemory).not.toHaveBeenCalled();
  expect(generateApiInterviewQuestion).not.toHaveBeenCalled();
});
it("restores management for the next sitting without a current offered question", async () => {
  jest
    .mocked(callInterviewApi)
    .mockResolvedValueOnce({
      ...state,
      session: { ...state.session, state: "finished" },
    })
    .mockResolvedValueOnce({
      status: "ok",
      sitting: 2,
      boundaries: [],
      nextCursor: null,
    });
  expect(
    (await handleApiInterview(request({ action: "boundaries" }), artistId))
      .status,
  ).toBe(200);
  expect(callInterviewApi).toHaveBeenLastCalledWith(
    expect.anything(),
    "boundaries",
    expect.objectContaining({ query: { sitting: 2 } }),
  );
});
it("rejects caller-chosen boundary scope and preserves continuation conflicts", async () => {
  expect(
    (
      await handleApiInterview(
        request({ action: "boundaries", sitting: 99 }),
        artistId,
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await handleApiInterview(
        request({ action: "boundaries", cursor: "x".repeat(4097) }),
        artistId,
      )
    ).status,
  ).toBe(400);
  expect(callInterviewApi).not.toHaveBeenCalled();
  jest
    .mocked(callInterviewApi)
    .mockResolvedValueOnce(state)
    .mockRejectedValueOnce(
      Object.assign(new Error("changed"), { status: 409 }),
    );
  expect(
    (
      await handleApiInterview(
        request({ action: "boundaries", cursor: "next" }),
        artistId,
      )
    ).status,
  ).toBe(409);
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
  jest.mocked(callInterviewApi).mockResolvedValue({
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
it.each([
  "Mandatory memory exceeds its context budget",
  "Mandatory memory exceeds its page budget",
  "Mandatory memory response exceeds its byte budget",
  "Mandatory memory API returned HTTP 413; restart after 409, sign in after 401",
  "Prior interview history exceeds its page budget",
  "Prior interview history exceeds its response budget",
  "Prior questions exceed their model context budget",
  "Interview check exceeds its context budget",
])("explains persistent saved-context limits: %s", async (message) => {
  jest
    .mocked(generateApiInterviewQuestion)
    .mockRejectedValue(new Error(message));
  const response = await handleApiInterview(
    request({ action: "continue", sessionId }),
    artistId,
  );
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({
    error:
      "I cannot safely prepare another question with all the saved context yet. Your saved answers remain available, and you can still review or remove topic instructions in Topic preferences.",
  });
  expect(callInterviewApi).not.toHaveBeenCalledWith(
    expect.anything(),
    `session/${sessionId}/offer`,
    expect.anything(),
  );
});
it("preserves a context-limit HTTP status without classifying transient failures by a loose keyword", async () => {
  jest
    .mocked(generateApiInterviewQuestion)
    .mockRejectedValue(
      Object.assign(new Error("Mandatory memory exceeds its context budget"), {
        status: 413,
      }),
    );
  expect(
    (
      await handleApiInterview(
        request({ action: "continue", sessionId }),
        artistId,
      )
    ).status,
  ).toBe(413);
  jest
    .mocked(generateApiInterviewQuestion)
    .mockRejectedValue(new Error("A provider budget service timed out"));
  const response = await handleApiInterview(
    request({ action: "continue", sessionId }),
    artistId,
  );
  const result = await response.json();
  expect(response.status).toBe(503);
  expect(result.error).toContain("reload and try again");
  expect(result.error).not.toContain("provider");
});
