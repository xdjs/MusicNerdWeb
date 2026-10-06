/** @jest-environment node */
import { handleArtistQuestion } from "../handleArtistQuestion";
import { getArtistById } from "@/server/utils/queries/artistQueries";
import { planArtistQuestion } from "../planArtistQuestion";
import { callResearchApi } from "../callResearchApi";
import { draftResearchAnswer } from "../draftResearchAnswer";
jest.mock("@/server/utils/queries/artistQueries", () => ({
  getArtistById: jest.fn(),
}));
jest.mock("../planArtistQuestion", () => ({ planArtistQuestion: jest.fn() }));
jest.mock("../callResearchApi", () => ({ callResearchApi: jest.fn() }));
jest.mock("../draftResearchAnswer", () => ({ draftResearchAnswer: jest.fn() }));
if (!Response.json)
  Response.json = (body, init) =>
    new Response(JSON.stringify(body), {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
const artistId = "11111111-1111-4111-8111-111111111111",
  jobId = "22222222-2222-4222-8222-222222222222";
const status = {
  status: "ok",
  jobId,
  stage: "checking_saved",
  provider: null,
  message: "Checking saved originals",
  updatedAt: "2026-10-06",
  references: [],
  limitations: [],
};
const request = (extra = {}) =>
  new Request("https://web.example/api/askArtist", {
    method: "POST",
    body: JSON.stringify({ artistId, question: "Who played drums?", ...extra }),
  });
beforeEach(() => {
  jest.resetAllMocks();
  jest
    .mocked(getArtistById)
    .mockResolvedValue({ id: artistId, name: "Artist" } as never);
  jest
    .mocked(planArtistQuestion)
    .mockResolvedValue({
      topic: "drum credits",
      evidenceNeed: "credits",
      freshness: "stored",
    });
  jest.mocked(callResearchApi).mockResolvedValue(status);
});
it("acknowledges the durable job before any collection or answer call", async () => {
  const r = await handleArtistQuestion(request());
  expect(r.status).toBe(202);
  expect((await r.json()).research.jobId).toBe(jobId);
  expect(callResearchApi).toHaveBeenCalledTimes(1);
  expect(draftResearchAnswer).not.toHaveBeenCalled();
});
it("resumes the known artist-scoped job without replanning or enqueueing", async () => {
  const r = await handleArtistQuestion(request({ jobId }));
  expect(r.status).toBe(202);
  expect(planArtistQuestion).not.toHaveBeenCalled();
  expect(callResearchApi).toHaveBeenCalledWith(
    `/api/artist/${artistId}/research/questions/${jobId}`,
    expect.anything(),
  );
});
it("does not generate a guessed answer to an unresolved request", async () => {
  jest
    .mocked(callResearchApi)
    .mockResolvedValue({ ...status, stage: "unresolved" });
  const r = await handleArtistQuestion(request({ jobId }));
  expect((await r.json()).answer).toMatch(/could not establish/i);
  expect(draftResearchAnswer).not.toHaveBeenCalled();
});
it("rejects invalid request scope before any API/model work", async () => {
  expect(
    (await handleArtistQuestion(request({ artistId: "not-an-id" }))).status,
  ).toBe(400);
  expect(callResearchApi).not.toHaveBeenCalled();
  expect(planArtistQuestion).not.toHaveBeenCalled();
});
it("does not fall back to legacy research after an API failure", async () => {
  jest.mocked(callResearchApi).mockRejectedValue(new Error("private details"));
  const r = await handleArtistQuestion(request());
  expect(r.status).toBe(503);
  expect(await r.text()).not.toContain("private details");
});
