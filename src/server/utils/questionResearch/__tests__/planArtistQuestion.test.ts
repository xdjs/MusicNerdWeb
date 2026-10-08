/** @jest-environment node */
import { planArtistQuestion } from "../planArtistQuestion";
import { generateText } from "@/server/lib/ai/generateText";
jest.mock("@/server/lib/ai/generateText", () => ({ generateText: jest.fn() }));
jest.mock("ai", () => ({ Output: { object: jest.fn() } }));
it("keeps the neutral public evidence request and strips absent optional routing fields", async () => {
  jest
    .mocked(generateText)
    .mockResolvedValue({
      output: {
        topic: "Record drum credits",
        evidenceNeed: "credits",
        freshness: "stored",
        platform: null,
        targetUrl: null,
        fromDate: null,
        toDate: null,
      },
    } as never);
  expect(await planArtistQuestion("Artist", "Who played drums?")).toEqual({
    topic: "Record drum credits",
    evidenceNeed: "credits",
    freshness: "stored",
  });
});
it("never accepts a model-invented original URL that was not in the question", async () => {
  jest
    .mocked(generateText)
    .mockResolvedValue({
      output: {
        topic: "Record credits",
        evidenceNeed: "credits",
        freshness: "stored",
        platform: null,
        targetUrl: "https://made-up.example/source",
        fromDate: null,
        toDate: null,
      },
    } as never);
  await expect(
    planArtistQuestion("Artist", "Who played drums?"),
  ).rejects.toThrow(/URL/);
});
it.each([
  ["How does LATASHÁ describe her music on her official website?", "stored"],
  ["What did growing up in New York contribute to her sound?", "stored"],
  ["What are her latest TikTok posts about?", "recent"],
  ["What has she posted this week?", "recent"],
])("does not invent a recent-only filter for %s", async (question, freshness) => {
  jest.mocked(generateText).mockResolvedValue({ output: {
    topic: "LATASHÁ music description", evidenceNeed: "reporting", freshness: "recent",
    platform: null, targetUrl: null, fromDate: null, toDate: null,
  }} as never);
  expect(await planArtistQuestion("LATASHÁ", question)).toMatchObject({ freshness });
});
