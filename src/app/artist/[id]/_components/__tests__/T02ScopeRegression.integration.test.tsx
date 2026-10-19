/**
 * T02 scope regression across the actual chat UI, ask route, planner, HTTP
 * adapter, original reread, writer/checker and rendered answer. All model and
 * API responses are local fixtures; this is not live generation or storage.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ReadableStream, WritableStream, TransformStream, TextEncoderStream, TextDecoderStream } from "node:stream/web";
import AskAboutArtist from "../AskAboutArtist";
import { POST as ask } from "@/app/api/askArtist/route";
import { POST as collect } from "@/app/api/artist/[id]/questionResearch/[jobId]/answer/route";
import { draftResearchAnswer } from "@/server/utils/questionResearch/draftResearchAnswer";
import { generateText } from "@/server/lib/ai/generateText";
import { getOrDraftResearchAnswer } from "@/server/utils/questionResearch/getOrDraftResearchAnswer";
import { continueCandidateResearch } from "@/server/utils/questionResearch/continueCandidateResearch";
import { preservePublicResearchScope } from "@/lib/questionResearch/preservePublicResearchScope";

jest.mock("@/env", () => ({ MUSICNERD_RESEARCH_API_KEY: "fixture-key-".repeat(4) }));
jest.mock("@/lib/musicNerdApi/const", () => ({ MUSICNERD_API_URL: "https://api.example" }));
jest.mock("@/server/lib/ai/generateText", () => ({ generateText: jest.fn() }));
jest.mock("@/server/utils/queries/artistQueries", () => ({ getArtistById: jest.fn() }));
jest.mock("@/server/utils/questionResearch/getQuestionVisitorKey", () => ({ getQuestionVisitorKey: jest.fn(async () => "a".repeat(64)) }));
jest.mock("@/server/utils/questionResearch/reuseQuestionRequest", () => ({ reuseQuestionRequest: jest.fn(async () => ({ state: "claimed", requestHash: "fixture", token: "fixture" })) }));
jest.mock("@/server/utils/questionResearch/reserveQuestionPlanning", () => ({ reserveQuestionPlanning: jest.fn() }));
jest.mock("@/server/utils/questionResearch/listReusableQuestionCandidates", () => ({ listReusableQuestionCandidates: jest.fn(async () => []) }));
jest.mock("@/server/utils/questionResearch/bindQuestionRequest", () => ({ bindQuestionRequest: jest.fn() }));
jest.mock("@/server/utils/questionResearch/releaseQuestionRequest", () => ({ releaseQuestionRequest: jest.fn(async () => undefined) }));
jest.mock("@/server/utils/questionResearch/registerResearchQuestion", () => ({ registerResearchQuestion: jest.fn(async () => true) }));
jest.mock("@/server/utils/questionResearch/getOrDraftResearchAnswer", () => ({ getOrDraftResearchAnswer: jest.fn() }));
jest.mock("@/server/utils/questionResearch/continueCandidateResearch", () => ({ continueCandidateResearch: jest.fn() }));
jest.mock("@/server/utils/questionResearch/continueQuestionResearch", () => ({ continueQuestionResearch: jest.fn(async () => null) }));

Object.assign(globalThis, { ReadableStream, WritableStream, TransformStream, TextEncoderStream, TextDecoderStream });
const primitives = jest.requireActual("next/dist/compiled/@edge-runtime/primitives/fetch") as typeof globalThis;
Object.assign(globalThis, { Request: primitives.Request, Response: primitives.Response, Headers: primitives.Headers });

const fixture = JSON.parse(readFileSync(join(__dirname, "fixtures/t02-scope-regressions.fixture.json"), "utf8")) as any;
const t02 = fixture.savedT02;
const canonical = fixture.canonicalT02.plannerOutput;
const identity = fixture.publicIdentityBoundary;
const jobId = "22222222-2222-4222-8222-222222222222";
const apiRequests: { path: string; method?: string; body?: Record<string, unknown> }[] = [];
let activeArtist: { id: string; name: string };
let activeOriginal: Record<string, unknown>;
let plannerOutput: Record<string, unknown>;
let apiState: Record<string, unknown>;
let plannerPrompts: Record<string, unknown>[];

beforeEach(() => {
  jest.clearAllMocks();
  apiRequests.length = 0;
  plannerPrompts = [];
  activeArtist = t02.artist;
  activeOriginal = t02.originals[0];
  plannerOutput = canonical;
  apiState = {
    status: "ok", jobId, stage: "complete", selection: "candidates", provider: null,
    message: "Evidence ready", updatedAt: "2026-10-19T12:00:00Z",
    references: [activeOriginal], limitations: [],
  };
  jest.mocked(require("@/server/utils/queries/artistQueries").getArtistById).mockImplementation(async () => ({ name: activeArtist.name }) as never);
  jest.mocked(getOrDraftResearchAnswer).mockImplementation(async input => ({
    state: "ready",
    result: await draftResearchAnswer(input.artistId, input.artistName, input.question, input.references, input.signal),
  }));
  jest.mocked(generateText).mockImplementation(async input => {
    const instructions = String(input.instructions ?? "");
    if (instructions.startsWith("Resolve")) {
      const prompt = JSON.parse(input.prompt as string);
      plannerPrompts.push(prompt);
      return { output: plannerOutput } as never;
    }
    if (instructions.startsWith("Verify"))
      return { output: { supported: true, supportedSentenceNumbers: [1], reason: "Supported." } } as never;
    const answerInput = JSON.parse(input.prompt as string);
    const originalText = answerInput.originals?.[0]?.text;
    return { output: { sentences: [{
      kind: "fact",
      text: "On public card KM-82, “Kite Museum” is the work title, and Elin Marr is named as the performing artist.",
      evidence: [{ n: 1, quote: originalText }],
    }], unanswered: null } } as never;
  });

  // All browser and API traffic is intercepted locally; unexpected operations fail.
  global.fetch = jest.fn(async (url, init) => {
    const target = new URL(String(url), "https://web.example");
    if (target.origin === "https://api.example") {
      expect(new Headers(init?.headers).get("X-MusicNerd-Research-Key")).toBe("fixture-key-".repeat(4));
      expect(init?.cache).toBe("no-store");
      expect(init?.redirect).toBe("error");
      apiRequests.push({
        path: target.pathname,
        method: init?.method,
        ...(init?.body ? { body: JSON.parse(String(init.body)) } : {}),
      });
      if (target.pathname.includes("/evidence/")) {
        expect(target.searchParams.get("revision")).toBe(activeOriginal.revision);
        return Response.json({ status: "ok", passage: activeOriginal, totalChars: String(activeOriginal.text).length, nextStart: null });
      }
      if (target.pathname.endsWith("/questions") || target.pathname.endsWith(`/questions/${jobId}`)) return Response.json(apiState);
      throw new Error(`Unexpected API operation: ${target.pathname}`);
    }
    if (target.pathname === "/api/askArtist") return ask(new Request(target, init));
    if (target.pathname.endsWith(`/questionResearch/${jobId}/answer`))
      return collect(new Request(target, init), { params: Promise.resolve({ id: activeArtist.id, jobId }) });
    throw new Error(`Unexpected browser operation: ${target.pathname}`);
  });
});

async function submit(question: string) {
  fireEvent.change(screen.getByRole("textbox"), { target: { value: question } });
  fireEvent.click(screen.getByRole("button", { name: "Submit question" }));
}

function requestBody(artist: typeof activeArtist, question: string, conversation: unknown[] = []) {
  return new Request("https://web.example/api/askArtist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ artistId: artist.id, question, conversation }),
  });
}

it("replays saved 007 in the chat and keeps the historical T02 scope overflow as a clarification", async () => {
  plannerOutput = t02.oldPlanner.patch.output;
  render(<AskAboutArtist artistId={t02.artist.id} artistName={t02.artist.name} />);
  await submit(t02.question);

  expect(await screen.findByText(/Could you narrow this to one public research question/)).toBeVisible();
  expect(apiRequests).toHaveLength(0);
  expect(jest.mocked(getOrDraftResearchAnswer)).not.toHaveBeenCalled();
  expect(jest.mocked(generateText)).toHaveBeenCalledTimes(1);
  expect(plannerPrompts[0]).toMatchObject({ artistName: t02.artist.name, question: t02.question, conversation: [] });
  expect(t02.conversation).toHaveLength(1); // The saved request includes context; the old chat UI replay began a fresh turn.
  expect(t02.oldPlanner.patch.recordedOutcome.status).toBe("answer_from_initial_response");

  // Baseline 008 predates required publicSubject. Reconstructing its saved topic
  // with its actual saved constraints still exceeds the same limit; do not add
  // invented fields to make the old model result appear compatible.
  for (const arm of ["patch", "baseline"] as const) {
    const old = t02.oldPlanner[arm].output;
    const scope = [t02.artist.name, ...(old.publicSubject?.qualifiers ?? []), ...(old.publicConstraints ?? [])];
    expect(preservePublicResearchScope(old.topic, scope)).toBeNull();
  }
  expect(t02.oldPlanner.baseline.recordedOutcome.body.answer).toMatch(/narrow this to one public research question/);
});

it("does not dispatch or invent a clarification from the legacy baseline 008 shape", async () => {
  plannerOutput = t02.oldPlanner.baseline.output;
  const response = await ask(requestBody(t02.artist, t02.question));
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ error: "Research is temporarily unavailable. Please try again." });
  expect(apiRequests).toHaveLength(0);
  expect(jest.mocked(getOrDraftResearchAnswer)).not.toHaveBeenCalled();
  expect(t02.oldPlanner.baseline.recordedOutcome.status).toBe("answer_from_initial_response");
  expect(t02.historicalClarification).toBe("Could you narrow this to one public research question? I couldn't preserve all its constraints within the request limit.");
});

it("completes the authored 113-character T02 plan through UI, HTTP, reread, writer/checker and rendering", async () => {
  activeArtist = t02.artist;
  activeOriginal = t02.originals[0];
  plannerOutput = canonical;
  const displayedAnswer = "On public card KM-82, “Kite Museum” is the work title, and Elin Marr is named as the performing artist.";
  expect(canonical.topic).toHaveLength(113);
  expect(canonical.publicConstraints.every((phrase: string) => canonical.topic.includes(phrase))).toBe(true);

  render(<AskAboutArtist artistId={t02.artist.id} artistName={t02.artist.name} />);
  await submit(t02.question);
  expect(await screen.findByText(/“Kite Museum” is the work title, and Elin Marr is named as the performing artist/)).toBeVisible();
  expect(screen.getByTestId("answer")).toHaveTextContent(displayedAnswer);
  expect(screen.getByTestId("answer")).not.toHaveTextContent("I couldn’t confirm the other details.");
  expect(screen.getByTestId("answer").querySelector(`a[href="${activeOriginal.url}"]`)).toBeTruthy();

  const dispatched = apiRequests.find(request => request.path.endsWith("/questions"));
  expect(dispatched?.method).toBe("POST");
  expect(dispatched?.body).toMatchObject({
    topic: canonical.topic,
    evidenceNeed: "credits",
    freshness: "stored",
    preferDirectEvidence: true,
  });
  expect(dispatched?.body).not.toHaveProperty("publicSubject");
  expect(dispatched?.body).not.toHaveProperty("publicConstraints");
  expect(dispatched?.body).not.toHaveProperty("conversation");
  expect(apiRequests.filter(request => request.path.includes("/evidence/")).map(request => request.path)).toHaveLength(1);
  expect(apiRequests.find(request => request.path.includes("/evidence/"))?.path).toContain(encodeURIComponent(String(activeOriginal.sourceId)));
  expect(getOrDraftResearchAnswer).toHaveBeenCalledTimes(1);
  expect(jest.mocked(getOrDraftResearchAnswer).mock.calls[0][0].question).toBe(t02.question);
  expect(jest.mocked(generateText)).toHaveBeenCalledTimes(3);
  expect(jest.mocked(continueCandidateResearch)).not.toHaveBeenCalled();
});

it("retains identity and a negative credit constraint while keeping private prior conversation off the public wire", async () => {
  activeArtist = identity.artist;
  activeOriginal = { ...t02.originals[0], sourceId: "vault:88888888-8888-4888-8888-888888888888" };
  plannerOutput = identity.plannerOutput;
  apiState = {
    status: "ok", jobId, stage: "searching", selection: "research", provider: null,
    message: "Research started", updatedAt: "2026-10-19T12:00:00Z", references: [], limitations: [],
  };
  const response = await ask(requestBody(identity.artist, identity.question, identity.conversation));
  expect(response.status).toBe(202);
  expect(plannerPrompts[0].conversation).toEqual(identity.conversation);
  const dispatched = apiRequests.find(request => request.path.endsWith("/questions"));
  expect(dispatched?.body?.topic).toBe(identity.plannerOutput.topic);
  expect(String(dispatched?.body?.topic)).toHaveLength(160);
  expect(String(dispatched?.body?.topic)).toContain("Lisbon instrumental duo");
  expect(String(dispatched?.body?.topic)).toContain("formerly Juniper Signal");
  expect(String(dispatched?.body?.topic)).toContain("no unsupported membership claims");
  expect(JSON.stringify(dispatched?.body)).not.toMatch(/Seaglass Lane|fictional sister Lora|home is 7/i);
  expect(dispatched?.body).not.toHaveProperty("conversation");
  expect(dispatched?.body).not.toHaveProperty("publicSubject");
  expect(dispatched?.body).not.toHaveProperty("publicConstraints");
  expect(apiRequests.filter(request => request.path.includes("/evidence/"))).toHaveLength(0);
});

it("clarifies instead of truncating a real identity-plus-exclusion overflow", async () => {
  activeArtist = identity.artist;
  plannerOutput = identity.overflowPlannerOutput;
  const requiredScope = [
    identity.artist.name,
    ...identity.plannerOutput.publicSubject.qualifiers,
    ...identity.overflowPlannerOutput.publicConstraints,
  ];
  expect(identity.overflowPlannerOutput.topic.length).toBeLessThanOrEqual(160);
  expect(preservePublicResearchScope(identity.overflowPlannerOutput.topic, requiredScope)).toBeNull();

  render(<AskAboutArtist artistId={identity.artist.id} artistName={identity.artist.name} />);
  await submit(identity.question);
  expect(await screen.findByText(/Could you narrow this to one public research question/)).toBeVisible();
  expect(apiRequests).toHaveLength(0);
  expect(jest.mocked(getOrDraftResearchAnswer)).not.toHaveBeenCalled();
});
