/**
 * Actual chat UI → browser client → ask/result routes → planner normalization →
 * public HTTP adapter → original read → writer/checker → rendered answer/follow-up.
 * Model outputs, API wire responses and Web admission/answer leases are fixtures.
 * This is deterministic integration coverage, not live inference or a DB/identity test.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ReadableStream, WritableStream, TransformStream, TextEncoderStream, TextDecoderStream } from "node:stream/web";
import AskAboutArtist from "../AskAboutArtist";
import { POST as ask } from "@/app/api/askArtist/route";
import { POST as collect } from "@/app/api/artist/[id]/questionResearch/[jobId]/answer/route";
import { draftResearchAnswer } from "@/server/utils/questionResearch/draftResearchAnswer";
import { generateText } from "@/server/lib/ai/generateText";
import { getOrDraftResearchAnswer } from "@/server/utils/questionResearch/getOrDraftResearchAnswer";
import { continueCandidateResearch } from "@/server/utils/questionResearch/continueCandidateResearch";

jest.mock("@/env", () => ({ MUSICNERD_RESEARCH_API_KEY: "fixture-key-".repeat(4) }));
jest.mock("@/lib/musicNerdApi/const", () => ({ MUSICNERD_API_URL: "https://api.example" }));
jest.mock("@/server/lib/ai/generateText", () => ({ generateText: jest.fn() }));
jest.mock("@/server/utils/queries/artistQueries", () => ({ getArtistById: jest.fn(async () => ({ name: "Oriel Loom" })) }));
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
const artistId = "11111111-1111-4111-8111-111111111111";
const jobId = "22222222-2222-4222-8222-222222222222";
const text = "Oriel Loom is the Bellwater acoustic trio. Folded Coast is its 2022 recording. A different Oriel Loom, the Harrow Quay electronic solo performer, released the 2025 club edition of Folded Coast, produced by Pax Cedar. These records do not list the trio's producer.";
const original = {
  sourceId: "vault:33333333-3333-4333-8333-333333333333", revision: "a".repeat(64),
  start: 0, end: text.length, text, url: "https://artist.example/credits", curation: "approved",
  evidenceKind: "original_text", speaker: "not_applicable", publishedAt: null, retrievedAt: null, truncated: false,
};
const state = { status: "ok", jobId, stage: "complete", selection: "candidates", provider: null,
  message: "Evidence ready", updatedAt: "2026-10-19", references: [original], limitations: [] };
const apiRequests: { path: string; method?: string; body?: Record<string, unknown> }[] = [];
let unavailable = false;

beforeEach(() => {
  jest.clearAllMocks(); apiRequests.length = 0; unavailable = false;
  jest.mocked(getOrDraftResearchAnswer).mockImplementation(async input => ({ state: "ready", result:
    await draftResearchAnswer(input.artistId, input.artistName, input.question, input.references, input.signal) }));
  jest.mocked(generateText).mockImplementation(async input => {
    const data = JSON.parse(input.prompt as string);
    if (input.instructions?.startsWith("Resolve")) return { output: {
      publicSubject: { name: "Oriel Loom", qualifiers: ["Bellwater trio"] },
      topic: "Production credits for Oriel Loom's 2022 album Folded Coast",
      publicConstraints: ["whether Pax Cedar produced Folded Coast"],
      evidenceNeed: "credits", freshness: "stored", retrieval: "relevance", answerScope: "focused",
      resolvedQuestion: data.question === "Which edition has that credit?"
        ? "Which edition of Folded Coast has the Pax Cedar producer credit?" : data.question,
      contextResolved: true, targetUrl: null, platform: null, fromDate: null, toDate: null,
    } } as never;
    if (input.instructions?.startsWith("Verify")) return { output: { supported: true, reason: "Supported." } } as never;
    const followup = data.question.startsWith("Which edition");
    return { output: { sentences: [{
      kind: followup ? "fact" : "limitation",
      text: followup ? "The credit belongs to the Harrow Quay performer's 2025 club edition."
        : "These records leave the Bellwater trio's producer [unverified]; the Pax Cedar credit belongs to the other performer's 2025 edition.",
      evidence: [{ n: 1, quote: text }],
    }], unanswered: followup ? null : "This unchecked field must never reach the listener." } } as never;
  });
  // Every request is handled locally. Unexpected destinations fail the test.
  global.fetch = jest.fn(async (url, init) => {
    const target = new URL(String(url), "https://web.example");
    if (target.origin === "https://api.example") {
      expect(new Headers(init?.headers).get("X-MusicNerd-Research-Key")).toBe("fixture-key-".repeat(4));
      expect(init?.cache).toBe("no-store"); expect(init?.redirect).toBe("error");
      apiRequests.push({ path: target.pathname, method: init?.method,
        ...(init?.body ? { body: JSON.parse(String(init.body)) } : {}) });
      if (target.pathname.includes("/evidence/")) {
        expect(target.searchParams.get("revision")).toBe(original.revision);
        if (unavailable) return Response.json({ error: "Revoked" }, { status: 404 });
        return Response.json({ status: "ok", passage: original, totalChars: text.length, nextStart: null });
      }
      if (target.pathname.endsWith("/questions") || target.pathname.endsWith(`/questions/${jobId}`)) return Response.json(state);
      throw new Error(`Unexpected API operation: ${target.pathname}`);
    }
    const request = new Request(target, init);
    if (target.pathname === "/api/askArtist") return ask(request);
    if (target.pathname.endsWith(`/questionResearch/${jobId}/answer`)) return collect(request, { params: Promise.resolve({ id: artistId, jobId }) });
    throw new Error(`Unexpected browser operation: ${target.pathname}`);
  });
});

async function submit(question: string) {
  fireEvent.change(screen.getByRole("textbox"), { target: { value: question } });
  fireEvent.click(screen.getByRole("button", { name: "Submit question" }));
}

it("renders the writer's cited gap without a generic suffix or a completeness repair", async () => {
  const defaultModel = jest.mocked(generateText).getMockImplementation()!;
  jest.mocked(generateText).mockImplementation(async input => {
    if (input.instructions?.startsWith("Resolve")) return defaultModel(input);
    if (input.instructions?.startsWith("Verify")) return { output: { supported: true, reason: "Supported." } } as never;
    return { output: { sentences: [{ kind: "limitation",
      text: "These records do not list the Bellwater trio's producer; the credited 2025 club edition belongs to a different performer.",
      evidence: [{ n: 1, quote: text }],
    }], unanswered: null } } as never;
  });
  render(<AskAboutArtist artistId={artistId} artistName="Oriel Loom" />);
  await submit("Did Pax Cedar produce the Bellwater trio Oriel Loom’s 2022 album Folded Coast?");
  await screen.findByText(/These records do not list the Bellwater trio's producer/);
  expect(screen.getByTestId("answer")).not.toHaveTextContent("I couldn’t confirm the other details.");
  expect(screen.getByTestId("answer").querySelector('a[href="https://artist.example/credits"]')).toBeTruthy();
  expect(jest.mocked(generateText)).toHaveBeenCalledTimes(3);
  expect(apiRequests.filter(request => request.path.includes("/evidence/"))).toHaveLength(1);
  expect(continueCandidateResearch).not.toHaveBeenCalled();
});

it("preserves public constraints through API dispatch and renders cited uncertainty before resolving a follow-up", async () => {
  render(<AskAboutArtist artistId={artistId} artistName="Oriel Loom" />);
  const question = "Did Pax Cedar produce the Bellwater trio Oriel Loom’s 2022 album Folded Coast?";
  await submit(question);
  await screen.findByText(/These records leave the Bellwater trio's producer \[unverified\]/);
  expect(screen.queryByText(/unchecked field/)).not.toBeInTheDocument();
  expect(screen.getByTestId("answer")).toHaveTextContent("I couldn’t confirm the other details.");
  expect(apiRequests[0].body).toMatchObject({ preferDirectEvidence: true,
    topic: "Production credits for Oriel Loom's 2022 album Folded Coast; Bellwater trio; whether Pax Cedar produced Folded Coast" });
  expect(apiRequests[0].body).not.toHaveProperty("publicConstraints");
  expect(apiRequests[0].body).not.toHaveProperty("publicSubject");
  expect(apiRequests[0].body).not.toHaveProperty("conversation");
  expect(apiRequests.some(r => r.path.includes("/evidence/vault%3A"))).toBe(true);
  for (const link of screen.getAllByTitle("artist.example")) expect(link).toHaveAttribute("href", original.url);
  await submit("Which edition has that credit?");
  await screen.findByText(/The credit belongs to the Harrow Quay performer's 2025 club edition/);
  const plans = jest.mocked(generateText).mock.calls.filter(([input]) => input.instructions?.startsWith("Resolve"));
  const followup = JSON.parse(plans[1][0].prompt as string);
  expect(followup.conversation[0]).toMatchObject({ question, sourceUrls: [original.url] });
  expect(followup.conversation[0].answer).toContain("[unverified]");
  expect(jest.mocked(getOrDraftResearchAnswer).mock.calls[1][0].question).toBe("Which edition of Folded Coast has the Pax Cedar producer credit?");
  expect(continueCandidateResearch).not.toHaveBeenCalled();
});

it("withholds the visible answer when the API cannot reopen its source, without collecting outside evidence", async () => {
  unavailable = true;
  render(<AskAboutArtist artistId={artistId} artistName="Oriel Loom" />);
  await submit("Who produced the Bellwater trio's recording?");
  await waitFor(() => expect(screen.getByRole("button", { name: "Try again" })).toBeVisible());
  expect(screen.queryByText(/These records leave/)).not.toBeInTheDocument();
  expect(jest.mocked(generateText).mock.calls).toHaveLength(1); // planning only
  expect(continueCandidateResearch).not.toHaveBeenCalled();
  expect(apiRequests.every(r => !r.path.includes("advance") && !r.path.endsWith("continue"))).toBe(true);
});
