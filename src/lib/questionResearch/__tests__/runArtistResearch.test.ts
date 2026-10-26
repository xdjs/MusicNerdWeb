import { getAccessToken } from "@privy-io/react-auth";
import { musicNerdApiUrl } from "@/lib/musicNerdApi/musicNerdApiUrl";
import { runArtistResearch } from "../runArtistResearch";
beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});
it("shows persisted progress, waits, and resumes the same job instead of enqueueing twice", async () => {
  const calls: unknown[] = [];
  const reply = (body: unknown, status = 200) => ({
    ok: true,
    status,
    json: async () => body,
  });
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce(
      reply(
        {
          research: {
            jobId: "job",
            stage: "checking_saved",
            message: "Checking Lore",
          },
        },
        202,
      ),
    )
    .mockResolvedValueOnce(
      reply({
        jobId: "job",
        stage: "searching",
        message: "Searching outside Lore",
      }),
    )
    .mockResolvedValueOnce(
      reply({ jobId: "job", stage: "complete", message: "Ready" }),
    )
    .mockResolvedValueOnce(reply({ answer: "An exact supported answer." }));
  const promise = runArtistResearch({
    artistId: "artist",
    question: "Question?",
    onProgress: (p) => calls.push(p),
    signal: new AbortController().signal,
  });
  await jest.advanceTimersByTimeAsync(6000);
  expect((await promise).answer).toBe("An exact supported answer.");
  expect(calls).toContainEqual(
    expect.objectContaining({ message: "Searching outside Lore" }),
  );
  const posts = jest
    .mocked(fetch)
    .mock.calls.filter(([, opts]) => opts?.method === "POST");
  expect(posts).toHaveLength(2);
  expect(posts[0][0]).toBe(musicNerdApiUrl("/api/askArtist"));
  expect(posts[1][0]).toBe(musicNerdApiUrl("/api/artist/artist/questionResearch/job/answer"));
  expect(JSON.parse(posts[1][1]!.body as string)).toEqual({question:"Question?"});
});
it("reconnects with the saved job and never submits an initial new request", async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ answer: "Saved result" }),
  });
  await runArtistResearch({
    artistId: "artist",
    question: "Question?",
    jobId: "saved",
    onProgress: () => {},
    signal: new AbortController().signal,
  });
  expect(jest.mocked(fetch).mock.calls[0][0]).toBe(musicNerdApiUrl("/api/artist/artist/questionResearch/saved/answer"));
  expect(JSON.parse(jest.mocked(fetch).mock.calls[0][1]!.body as string)).toEqual({question:"Question?"});
});
it("keeps polling when a concurrent worker holds the answer-check lease", async () => {
  const reply = (body: unknown, status = 200) => ({ ok: true, status, json: async () => body });
  global.fetch = jest.fn()
    .mockResolvedValueOnce(reply({ research: { jobId: "job", stage: "complete", message: "Research done" } }, 202))
    .mockResolvedValueOnce(reply({ research: { jobId: "job", stage: "complete", message: "Checking the sourced answer" } }, 202))
    .mockResolvedValueOnce(reply({ jobId: "job", stage: "complete", message: "Research done" }))
    .mockResolvedValueOnce(reply({ answer: "Saved answer", sources: [] }));
  const promise = runArtistResearch({ artistId: "artist", question: "Question?", signal: new AbortController().signal, onProgress: () => {} });
  await jest.advanceTimersByTimeAsync(6000);
  expect((await promise).answer).toBe("Saved answer");
  expect(jest.mocked(fetch).mock.calls.filter(([, opts]) => opts?.method === "POST")).toHaveLength(3);
});
it("retains a saved job when answer verification fails before any progress response", async () => {
  const jobId = "22222222-2222-4222-8222-222222222222";
  const onProgress = jest.fn();
  global.fetch = jest
    .fn()
    .mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: "Answer verification failed", jobId }),
    });
  await expect(
    runArtistResearch({
      artistId: "artist",
      question: "Question?",
      signal: new AbortController().signal,
      onProgress,
    }),
  ).rejects.toThrow("Answer verification failed");
  expect(onProgress).toHaveBeenCalledWith(
    expect.objectContaining({ jobId, stage: "complete" }),
  );
});
it("sends bounded conversation only when starting and polls with the resolved standalone question", async () => {
  const reply = (body: unknown, status = 200) => ({ ok: true, status, json: async () => body });
  const resolvedQuestion = "Who created the PPNE NYC visualizer?";
  const conversation = [{ question: "What post?", answer: "The PPNE NYC visualizer." }];
  global.fetch = jest.fn()
    .mockResolvedValueOnce(reply({ research: { jobId: "job", stage: "checking_saved", message: "Checking", resolvedQuestion } }, 202))
    .mockResolvedValueOnce(reply({ jobId: "job", stage: "complete", message: "Read originals" }))
    .mockResolvedValueOnce(reply({ answer: "The verified creator." }));
  const onProgress = jest.fn();
  await runArtistResearch({ artistId: "artist", question: "Who created it?", conversation, signal: new AbortController().signal, onProgress });
  const posts = jest.mocked(fetch).mock.calls.filter(([, init]) => init?.method === "POST");
  expect(JSON.parse(posts[0][1]!.body as string)).toMatchObject({ question: "Who created it?", conversation });
  expect(JSON.parse(posts[1][1]!.body as string)).toEqual({ question: resolvedQuestion });
  expect(onProgress).toHaveBeenLastCalledWith(expect.objectContaining({ resolvedQuestion }));
});
it("retries the same resolved question without sending a different conversation", async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ answer: "Saved answer" }) });
  await runArtistResearch({ artistId: "artist", question: "Who created it?", resolvedQuestion: "Who created PPNE NYC?", jobId: "job", conversation: [{ question: "Later unrelated ask?", answer: "Other work" }], signal: new AbortController().signal, onProgress: jest.fn() });
  expect(JSON.parse(jest.mocked(fetch).mock.calls[0][1]!.body as string)).toEqual({ question: "Who created PPNE NYC?" });
});
it('passes a terminal-worker retry boundary to the UI instead of treating it as an answer',async()=>{
 global.fetch=jest.fn().mockResolvedValue({ok:false,status:503,json:async()=>({error:'Lookup failed.',retryFromStart:true})});
 const result=await runArtistResearch({artistId:'artist',question:'What else?',jobId:'dead-job',signal:new AbortController().signal,onProgress:jest.fn()});
 expect(result).toEqual({error:'Lookup failed.',retryFromStart:true});expect(global.fetch).toHaveBeenCalledTimes(1);
});
it('resumes a throttled completed answer without planning or creating another job', async () => {
 const reply = (body: unknown, status = 200, retry?: string) => ({ ok: status < 400, status, headers: new Headers(retry ? { 'Retry-After': retry } : {}), json: async () => body });
 global.fetch=jest.fn()
  .mockResolvedValueOnce(reply({research:{jobId:'saved',stage:'checking_saved',message:'Checking',resolvedQuestion:'Who filmed the PPNE NYC visualizer?'}},202))
  .mockResolvedValueOnce(reply({jobId:'saved',stage:'complete',message:'Complete'}))
  .mockResolvedValueOnce(reply({error:'Too many requests'},429,'3'))
  .mockResolvedValueOnce(reply({answer:'The credited filmmaker.'}));
 const onCooldown=jest.fn();
 const result=runArtistResearch({artistId:'artist',question:'Who filmed it?',signal:new AbortController().signal,onProgress:jest.fn(),onCooldown});
 await jest.advanceTimersByTimeAsync(2999);expect(fetch).toHaveBeenCalledTimes(3);
 await jest.advanceTimersByTimeAsync(1);expect((await result).answer).toBe('The credited filmmaker.');
 const calls=jest.mocked(fetch).mock.calls;
 expect(calls.filter(([url])=>url===musicNerdApiUrl('/api/askArtist'))).toHaveLength(1);
 expect(calls[2]).toEqual(calls[3]);expect(calls[3][0]).toBe(musicNerdApiUrl('/api/artist/artist/questionResearch/saved/answer'));
 expect(JSON.parse(calls[3][1]!.body as string)).toEqual({question:'Who filmed the PPNE NYC visualizer?'});
 expect(onCooldown).toHaveBeenCalledWith(3);
});
it('waits through a throttled status read and keeps the existing job', async () => {
 const reply = (body: unknown, status = 200, retry?: string) => ({ ok: status < 400, status, headers: new Headers(retry ? { 'Retry-After': retry } : {}), json: async () => body });
 global.fetch=jest.fn()
  .mockResolvedValueOnce(reply({research:{jobId:'saved',stage:'checking_saved',message:'Checking'}},202))
  .mockResolvedValueOnce(reply({error:'Too many requests'},429,'2'))
  .mockResolvedValueOnce(reply({jobId:'saved',stage:'complete',message:'Complete'}))
  .mockResolvedValueOnce(reply({answer:'Saved answer'}));
 const result=runArtistResearch({artistId:'artist',question:'Question?',jobId:'saved',signal:new AbortController().signal,onProgress:jest.fn()});
 await jest.advanceTimersByTimeAsync(2000);expect((await result).answer).toBe('Saved answer');
 expect(jest.mocked(fetch).mock.calls.some(([url])=>url===musicNerdApiUrl('/api/askArtist'))).toBe(false);
 expect(jest.mocked(fetch).mock.calls[1]).toEqual(jest.mocked(fetch).mock.calls[2]);
});

it('requests a completed acknowledgement directly and follows a server-issued continuation job',async()=>{
 const reply=(body:unknown,status=200)=>({ok:true,status,json:async()=>body});
 global.fetch=jest.fn()
  .mockResolvedValueOnce(reply({research:{jobId:'saved',stage:'complete',message:'Checked sources',resolvedQuestion:'Resolved question?'}},202))
  .mockResolvedValueOnce(reply({research:{jobId:'continued',stage:'checking_saved',message:'Checking Lore'}},202))
  .mockResolvedValueOnce(reply({jobId:'continued',stage:'complete',message:'Ready'}))
  .mockResolvedValueOnce(reply({answer:'A verified answer.'}));
 const promise=runArtistResearch({artistId:'artist',question:'Question?',signal:new AbortController().signal,onProgress:jest.fn()});
 await jest.advanceTimersByTimeAsync(5000);
 expect((await promise).answer).toBe('A verified answer.');
 expect(jest.mocked(fetch).mock.calls.map(([url])=>url)).toEqual([musicNerdApiUrl('/api/askArtist'),musicNerdApiUrl('/api/artist/artist/questionResearch/saved/answer'),musicNerdApiUrl('/api/artist/artist/questionResearch/continued'),musicNerdApiUrl('/api/artist/artist/questionResearch/continued/answer')]);
 expect(JSON.parse(jest.mocked(fetch).mock.calls[3][1]!.body as string)).toEqual({question:'Resolved question?'});
});

it.each(['visitor_question_quota', 'question_planning_quota', 'saved_evidence_quota', 'research_quota'])('preserves %s metadata from a 429 response without throwing it away', async code => {
 const resetAt = new Date(Date.now() + 3000).toISOString();
 const body = { code, error: 'Budget exhausted.', resetAt, retryAfterSeconds: 3 };
 global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429, headers: new Headers({ 'Retry-After': '3', 'X-MusicNerd-Quota': 'true' }), json: async () => body });
 const result = runArtistResearch({ artistId: 'artist', question: 'Who played drums?', signal: new AbortController().signal, onProgress: jest.fn() });
 await expect(result).resolves.toMatchObject({ error: body.error, quota: { code, resetAt } });
 expect(fetch).toHaveBeenCalledTimes(1);
});
it('preserves a quota received while checking an existing job', async () => {
 const resetAt = new Date(Date.now() + 60000).toISOString();
 global.fetch = jest.fn()
  .mockResolvedValueOnce({ ok: true, status: 202, json: async () => ({ research: { jobId: 'saved', stage: 'reading', message: 'Reading' } }) })
  .mockResolvedValueOnce({ ok: false, status: 429, headers: new Headers({ 'X-MusicNerd-Quota': 'true' }), json: async () => ({ code: 'saved_evidence_quota', resetAt, retryAfterSeconds: 60 }) });
 await expect(runArtistResearch({ artistId: 'artist', question: 'Question?', jobId: 'saved', signal: new AbortController().signal, onProgress: jest.fn() }))
  .resolves.toMatchObject({ quota: { code: 'saved_evidence_quota', resetAt } });
 expect(fetch).toHaveBeenCalledTimes(2);
});
it('keeps an outside-research quota and its explanatory answer on a terminal 200', async () => {
 const resetAt = new Date(Date.now() + 60000).toISOString();
 global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ answer: 'Saved sources do not cover that yet.', code: 'research_quota', resetAt, retryAfterSeconds: 60 }) });
 await expect(runArtistResearch({ artistId: 'artist', question: 'Question?', signal: new AbortController().signal, onProgress: jest.fn() }))
  .resolves.toMatchObject({ answer: 'Saved sources do not cover that yet.', quota: { code: 'research_quota', resetAt } });
});

it("asks MusicNerdAPI with the visitor's Privy token and reads the job without cookies", async () => {
  jest.mocked(getAccessToken).mockResolvedValueOnce("visitor-token");
  const reply = (body: unknown, status = 200) => ({ ok: true, status, json: async () => body });
  global.fetch = jest.fn()
    .mockResolvedValueOnce(reply({ status: "ok", research: { jobId: "job", stage: "checking_saved", message: "Checking" } }, 202))
    .mockResolvedValueOnce(reply({ status: "ok", jobId: "job", stage: "complete", message: "Ready", retryAfterMs: 5000 }))
    .mockResolvedValueOnce(reply({ status: "ok", answer: "A verified answer.", sources: [] }));
  const result = await runArtistResearch({ artistId: "artist", question: "Question?", signal: new AbortController().signal, onProgress: jest.fn() });
  expect(result.answer).toBe("A verified answer.");
  const [ask, poll, answer] = jest.mocked(fetch).mock.calls;
  expect(ask[0]).toBe(musicNerdApiUrl("/api/askArtist"));
  expect(ask[1]).toMatchObject({ method: "POST", credentials: "omit", headers: { Authorization: "Bearer visitor-token", "Content-Type": "application/json" } });
  expect(poll[0]).toBe(musicNerdApiUrl("/api/artist/artist/questionResearch/job"));
  expect(poll[1]).toMatchObject({ credentials: "omit", cache: "no-store" });
  expect(answer[0]).toBe(musicNerdApiUrl("/api/artist/artist/questionResearch/job/answer"));
  expect(answer[1]).toMatchObject({ method: "POST", credentials: "omit" });
  expect((answer[1]!.headers as Record<string, string>).Authorization).toBeUndefined();
});

it("asks anonymously when the visitor is signed out", async () => {
  jest.mocked(getAccessToken).mockResolvedValueOnce(null as unknown as string);
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ status: "ok", answer: "Answer.", sources: [] }) });
  await runArtistResearch({ artistId: "artist", question: "Question?", signal: new AbortController().signal, onProgress: jest.fn() });
  const [url, init] = jest.mocked(fetch).mock.calls[0];
  expect(url).toBe(musicNerdApiUrl("/api/askArtist"));
  expect(init).toMatchObject({ credentials: "omit", headers: { "Content-Type": "application/json" } });
  expect((init!.headers as Record<string, string>).Authorization).toBeUndefined();
});

it("asks anonymously when Privy cannot provide a token", async () => {
  jest.mocked(getAccessToken).mockRejectedValueOnce(new Error("Privy not ready"));
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ status: "ok", answer: "Answer.", sources: [] }) });
  await expect(runArtistResearch({ artistId: "artist", question: "Question?", signal: new AbortController().signal, onProgress: jest.fn() })).resolves.toMatchObject({ answer: "Answer." });
  expect((jest.mocked(fetch).mock.calls[0][1]!.headers as Record<string, string>).Authorization).toBeUndefined();
});
