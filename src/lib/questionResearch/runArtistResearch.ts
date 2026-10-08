export type ResearchProgress = {
  jobId: string;
  stage: string;
  message: string;
  provider?: string | null;
};
export type QuestionAnswer = {
  answer?: string;
  error?: string;
  sources?: unknown[];
  suggestions?: unknown[];
  mentions?: unknown[];
  songs?: unknown[];
  instagramMentions?: unknown[];
  bandcamp?: string | null;
  fromOpenWeb?: boolean;
  webDomains?: unknown[];
};
/** One explicit question starts work; subsequent polls and reconnects reuse its durable job. */
export async function runArtistResearch(input: {
  artistId: string;
  question: string;
  jobId?: string;
  signal: AbortSignal;
  onProgress: (progress: ResearchProgress) => void;
}): Promise<QuestionAnswer> {
  const signal = AbortSignal.any([
    input.signal,
    AbortSignal.timeout(5 * 60_000),
  ]);
  const post = async (jobId?: string) => {
    const r = await fetch("/api/askArtist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        artistId: input.artistId,
        question: input.question,
        ...(jobId ? { jobId } : {}),
      }),
      signal,
    });
    const data = await r.json();
    if (!r.ok) {
      if (
        r.status === 503 &&
        typeof data.jobId === "string" &&
        /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
          data.jobId,
        )
      )
        input.onProgress({
          jobId: data.jobId,
          stage: "complete",
          message: "Research is saved; the answer could not be verified.",
        });
      throw new Error(
        typeof data.error === "string"
          ? data.error
          : "Research could not finish.",
      );
    }
    return { data, status: r.status };
  };
  const first = await post(input.jobId);
  if (first.status !== 202) return first.data;
  const jobId = first.data.research?.jobId;
  if (typeof jobId !== "string") throw new Error("Research job unavailable");
  input.onProgress(first.data.research);
  for (;;) {
    signal.throwIfAborted();
    const r = await fetch(
      `/api/artist/${input.artistId}/questionResearch/${encodeURIComponent(jobId)}`,
      { signal, cache: "no-store" },
    );
    const progress = await r.json();
    if (!r.ok)
      throw new Error(progress.error ?? "Research could not be checked.");
    input.onProgress(progress);
    if (
      ["complete", "unresolved", "failed", "cancelled"].includes(progress.stage)
    )
      return (await post(jobId)).data;
    await new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        clearTimeout(timer);
        reject(
          new Error(
            "Stopped waiting. Your research is saved and can be resumed.",
          ),
        );
      };
      const timer = setTimeout(() => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      }, 5000);
      if (signal.aborted) onAbort();
      else signal.addEventListener("abort", onAbort, { once: true });
    });
  }
}
