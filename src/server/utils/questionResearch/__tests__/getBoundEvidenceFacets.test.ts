/** @jest-environment node */
import { db } from "@/server/db/drizzle";
import { getBoundEvidenceFacets } from "../getBoundEvidenceFacets";

jest.mock("@/server/db/drizzle", () => ({ db: { execute: jest.fn() } }));
const execute = jest.mocked(db.execute);
const artistId = "11111111-1111-4111-8111-111111111111";
const jobId = "22222222-2222-4222-8222-222222222222";
const hash = "a".repeat(64);

beforeEach(() => jest.resetAllMocks());

it("loads valid canonical facets from the exact saved job/question binding", async () => {
  execute.mockResolvedValueOnce([{ routing: { evidenceFacets: [
    { id: "f1", intent: "compare the named editions" },
    { id: "f2", intent: "explain their production difference" },
  ] } }] as never);
  expect(await getBoundEvidenceFacets({ artistId, jobId, questionHashes: [hash] })).toEqual({ state: "ready", facets: [
    { id: "f1", intent: "compare the named editions" },
    { id: "f2", intent: "explain their production difference" },
  ] });
  expect(execute).toHaveBeenCalledTimes(1);
});

it("keeps omitted legacy facets unknown and rejects malformed saved bindings", async () => {
  execute.mockResolvedValueOnce([{ routing: { topic: "old request" } }] as never);
  expect(await getBoundEvidenceFacets({ artistId, jobId, questionHashes: [hash] })).toEqual({ state: "legacy" });
  execute.mockResolvedValueOnce([{ routing: { evidenceFacets: [
    { id: "f2", intent: "the first part" },
  ] } }] as never);
  expect(await getBoundEvidenceFacets({ artistId, jobId, questionHashes: [hash] })).toEqual({ state: "invalid" });
  expect(await getBoundEvidenceFacets({ artistId, jobId, questionHashes: ["bad"] })).toEqual({ state: "invalid" });
});
