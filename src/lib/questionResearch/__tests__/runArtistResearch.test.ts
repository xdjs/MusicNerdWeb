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
  global.fetch = jest
    .fn()
    .mockResolvedValue({
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
