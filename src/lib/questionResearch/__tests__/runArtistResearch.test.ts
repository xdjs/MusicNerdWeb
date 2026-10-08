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
