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
    retrieval: "relevance",
    resolvedQuestion: "Who played drums?",
  });
  expect(generateText).toHaveBeenCalledWith(expect.objectContaining({ thinkingBudget: 0, maxRetries: 0 }));
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
it("resolves a follow-up with bounded public conversation without treating it as evidence", async () => {
  jest.mocked(generateText).mockResolvedValue({ output: {
    topic: "PPNE NYC visualizer creator", evidenceNeed: "credits", freshness: "stored",
    retrieval: "relevance", resolvedQuestion: "Who created LATASHA's PPNE NYC visualizer?",
    platform: null, targetUrl: null, fromDate: null, toDate: null,
  }} as never);
  const conversation = [{ question: "What was that post about?", answer: "It discussed the PPNE NYC visualizer." }];
  const plan = await planArtistQuestion("LATASHA", "Who created it?", undefined, conversation);
  expect(plan).toMatchObject({ resolvedQuestion: "Who created LATASHA's PPNE NYC visualizer?" });
  expect(JSON.parse(jest.mocked(generateText).mock.calls.at(-1)![0].prompt as string)).toMatchObject({ conversation });
});
it("routes newest available posts without a seven-day freshness cutoff", async () => {
  jest.mocked(generateText).mockResolvedValue({ output: {
    topic: "artist newest Instagram post", evidenceNeed: "social_caption", freshness: "recent",
    retrieval: "latest", resolvedQuestion: "What is the latest Instagram post?",
    platform: "instagram", targetUrl: null, fromDate: null, toDate: null,
  }} as never);
  expect(await planArtistQuestion("Artist", "What is the latest Instagram post?")).toMatchObject({ retrieval: "latest", freshness: "stored", platform: "instagram" });
});
it("preserves explicit dates for latest retrieval", async () => {
  jest.mocked(generateText).mockResolvedValue({ output: {
    topic: "artist latest post", evidenceNeed: "social_caption", freshness: "recent",
    retrieval: "latest", resolvedQuestion: "What was the latest post in September 2026?",
    platform: null, targetUrl: null, fromDate: "2026-09-01", toDate: "2026-09-30",
  }} as never);
  expect(await planArtistQuestion("Artist", "What was the latest post in September 2026?")).toMatchObject({ fromDate: "2026-09-01", toDate: "2026-09-30" });
});
it('allows an exact cited original for a matching follow-up and explains the subject boundary', async()=>{
 const sourceUrl='https://www.instagram.com/p/example-original/';
 jest.mocked(generateText).mockResolvedValue({output:{topic:'rooftop visualizer filming credit',evidenceNeed:'credits',freshness:'stored',retrieval:'relevance',resolvedQuestion:'Who filmed the rooftop visualizer described in the cited post?',targetUrl:sourceUrl,platform:'instagram',fromDate:null,toDate:null}} as never);
 expect(await planArtistQuestion('Artist','Who filmed it?',undefined,[{question:'What is this post about?',answer:'The rooftop visualizer.',sourceUrls:[sourceUrl]}])).toMatchObject({targetUrl:sourceUrl});
 expect(jest.mocked(generateText).mock.calls.at(-1)![0].instructions).toContain('Do not carry citation URLs into an unrelated new question');
});
it('does not accept a routing URL merely embedded in prior answer prose',async()=>{
 const sourceUrl='https://untrusted.example/work';
 jest.mocked(generateText).mockResolvedValue({output:{topic:'film credit',evidenceNeed:'credits',freshness:'stored',resolvedQuestion:'Who filmed the visualizer?',targetUrl:sourceUrl,platform:null,fromDate:null,toDate:null}} as never);
 await expect(planArtistQuestion('Artist','Who filmed it?',undefined,[{question:'What post?',answer:`See ${sourceUrl}`}])).rejects.toThrow(/URL/);
});
it.each([
 ['What did Pete post most recently on InProcess?', 'inprocess'],
 ['What is the latest Spotify release?', 'spotify'],
 ['What is their latest Deezer release?', 'deezer'],
])('preserves explicit platform even when the model picks a different provider: %s', async (question, platform) => {
 jest.mocked(generateText).mockResolvedValue({output:{topic:'latest artist posts',evidenceNeed:'social_caption',freshness:'recent',retrieval:'latest',targetUrl:null,platform:'tiktok',fromDate:null,toDate:null}} as never);
 expect(await planArtistQuestion('Artist',question)).toMatchObject({platform,retrieval:'latest',freshness:'stored'});
});
it('does not invent a platform restriction for a broad latest overview', async () => {
 jest.mocked(generateText).mockResolvedValue({output:{topic:'latest artist posts',evidenceNeed:'social_caption',freshness:'stored',retrieval:'latest',targetUrl:null,platform:'tiktok',fromDate:null,toDate:null}} as never);
 expect(await planArtistQuestion('Artist','What is the latest?')).not.toHaveProperty('platform');
});
it('drops a stale cited target when the current question explicitly changes platforms', async () => {
 const url='https://www.tiktok.com/@artist/video/123';
 jest.mocked(generateText).mockResolvedValue({output:{topic:'latest artist posts',evidenceNeed:'social_caption',freshness:'stored',retrieval:'latest',resolvedQuestion:'What is their latest InProcess post?',targetUrl:url,platform:'tiktok',fromDate:null,toDate:null}} as never);
 const plan=await planArtistQuestion('Artist','What is their latest on InProcess?',undefined,[{question:'What is this TikTok?',answer:'A video.',sourceUrls:[url]}]);
 expect(plan).toMatchObject({platform:'inprocess'});
 expect(plan).not.toHaveProperty('targetUrl');
});
