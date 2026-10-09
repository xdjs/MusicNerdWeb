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
  expect(JSON.parse(posts[1][1]!.body as string).jobId).toBe("job");
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
  expect(
    JSON.parse(jest.mocked(fetch).mock.calls[0][1]!.body as string).jobId,
  ).toBe("saved");
});
it("keeps polling when a concurrent worker holds the answer-check lease", async () => {
  const reply = (body: unknown, status = 200) => ({ ok: true, status, json: async () => body });
  global.fetch = jest.fn()
    .mockResolvedValueOnce(reply({ research: { jobId: "job", stage: "complete", message: "Research done" } }, 202))
    .mockResolvedValueOnce(reply({ jobId: "job", stage: "complete", message: "Research done" }))
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
  expect(JSON.parse(posts[1][1]!.body as string)).toEqual({ artistId: "artist", question: resolvedQuestion, jobId: "job" });
  expect(onProgress).toHaveBeenLastCalledWith(expect.objectContaining({ resolvedQuestion }));
});
it("retries the same resolved question without sending a different conversation", async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ answer: "Saved answer" }) });
  await runArtistResearch({ artistId: "artist", question: "Who created it?", resolvedQuestion: "Who created PPNE NYC?", jobId: "job", conversation: [{ question: "Later unrelated ask?", answer: "Other work" }], signal: new AbortController().signal, onProgress: jest.fn() });
  expect(JSON.parse(jest.mocked(fetch).mock.calls[0][1]!.body as string)).toEqual({ artistId: "artist", question: "Who created PPNE NYC?", jobId: "job" });
});
it('passes a terminal-worker retry boundary to the UI instead of treating it as an answer',async()=>{
 global.fetch=jest.fn().mockResolvedValue({ok:false,status:503,json:async()=>({error:'Lookup failed.',retryFromStart:true})});
 const result=await runArtistResearch({artistId:'artist',question:'What else?',jobId:'dead-job',signal:new AbortController().signal,onProgress:jest.fn()});
 expect(result).toEqual({error:'Lookup failed.',retryFromStart:true});expect(global.fetch).toHaveBeenCalledTimes(1);
});
