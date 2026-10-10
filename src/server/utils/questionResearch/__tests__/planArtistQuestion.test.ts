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
    answerScope: "focused",
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
it("routes an explicit latest-release identification to catalog evidence even when the model calls it reporting", async () => {
 jest.mocked(generateText).mockResolvedValue({output:{topic:'Dutchyyy latest music release',evidenceNeed:'reporting',freshness:'stored',retrieval:'latest',targetUrl:null,platform:null,fromDate:null,toDate:null}} as never);
 expect(await planArtistQuestion('Dutchyyy',"What's Dutchyyy's latest release?")).toMatchObject({evidenceNeed:'release_date',retrieval:'latest'});
});

it.each([
 ["What inspired Dutchyyy's latest album?", 'reporting'],
 ["What is the latest release post about?", 'social_caption'],
 ["Who produced Dutchyyy's latest release?", 'credits'],
])('preserves the evidence type for a question about a release: %s', async (question, evidenceNeed) => {
 jest.mocked(generateText).mockResolvedValue({output:{topic:'Dutchyyy latest release context',evidenceNeed,freshness:'stored',retrieval:'relevance',targetUrl:null,platform:null,fromDate:null,toDate:null}} as never);
 expect(await planArtistQuestion('Dutchyyy',question)).toMatchObject({evidenceNeed,retrieval:'relevance'});
});
it('keeps a broader recent-activity follow-up recent and excludes already discussed sources',async()=>{
 const url='https://www.inprocess.world/collect/base:example/2';
 jest.mocked(generateText).mockResolvedValue({output:{topic:'Pete Rango other projects',evidenceNeed:'reporting',freshness:'stored',retrieval:'relevance',resolvedQuestion:'What other projects has Pete Rango been working on?',targetUrl:url,platform:'inprocess',fromDate:null,toDate:null}} as never);
 const result=await planArtistQuestion('Pete Rango','what else has he been up to?',undefined,[{question:"What's Pete Rango's latest project?",answer:'Plugin designs.',sourceUrls:[url]}]);
 expect(result).toMatchObject({retrieval:'latest',freshness:'stored',excludeSourceUrls:[url]});
 expect(result).not.toHaveProperty('targetUrl');expect(result).not.toHaveProperty('platform');
});

it('normalizes artist possessives so the same topic can reuse its saved job',async()=>{
 jest.mocked(generateText).mockResolvedValue({output:{topic:"Artist's latest project",evidenceNeed:'reporting',freshness:'stored',retrieval:'latest',targetUrl:null,platform:null,fromDate:null,toDate:null}} as never);
 expect(await planArtistQuestion('Artist',"What's Artist's latest project?")).toMatchObject({topic:'Artist latest project'});
});

it("retains overview intent for a broad request and focused intent for a latest post", async () => {
  const base = {topic: "Artist recent activity", evidenceNeed: "reporting", freshness: "stored", retrieval: "latest", platform: null, targetUrl: null, fromDate: null, toDate: null};
  jest.mocked(generateText).mockResolvedValue({output:{...base, answerScope:"overview"}} as never);
  expect(await planArtistQuestion("Artist", "What's new with Artist?")).toMatchObject({answerScope:"overview", retrieval:"latest"});
  jest.mocked(generateText).mockResolvedValue({output:{...base, answerScope:"focused", evidenceNeed:"social_caption"}} as never);
  expect(await planArtistQuestion("Artist", "What is their latest Instagram post?")).toMatchObject({answerScope:"focused", platform:"instagram"});
});
it("does not broaden a follow-up explicitly anchored to the same video", async () => {
  const url = "https://www.instagram.com/p/clip/";
  jest.mocked(generateText).mockResolvedValue({ output: { topic: "Artist same video activity", evidenceNeed: "spoken_content", freshness: "stored", retrieval: "relevance", answerScope: "focused", targetUrl: url, platform: "instagram", fromDate: null, toDate: null, resolvedQuestion: "What else is Artist doing in that video?" } } as never);
  const result = await planArtistQuestion("Artist", "What else is he doing in that video?", undefined, [{ question: "What is this video about?", answer: "An archive session.", sourceUrls: [url] }]);
  expect(result).toMatchObject({ answerScope: "focused", targetUrl: url, retrieval: "relevance" });
  expect(result.excludeSourceUrls).toBeUndefined();
});
