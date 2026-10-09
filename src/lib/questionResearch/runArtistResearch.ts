import type { PublicChatTurn } from "./publicChatTypes";
export type ResearchProgress = {
  jobId: string;
  stage: string;
  message: string;
  provider?: string | null;
  resolvedQuestion?: string;
};
export type QuestionAnswer = {
  answer?: string;
  error?: string;
  retryFromStart?: boolean;
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
  conversation?: PublicChatTurn[];
  resolvedQuestion?: string;
  jobId?: string;
  signal: AbortSignal;
  onProgress: (progress: ResearchProgress) => void;
}): Promise<QuestionAnswer> {
  const signal = AbortSignal.any([
    input.signal,
    AbortSignal.timeout(5 * 60_000),
  ]);
  let resolvedQuestion = input.resolvedQuestion;
  const post = async (jobId?: string) => {
    const r = await fetch("/api/askArtist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        artistId: input.artistId,
        question: jobId ? resolvedQuestion ?? input.question : input.question,
        ...(!jobId && input.conversation?.length ? { conversation: input.conversation } : {}),
        ...(jobId ? { jobId } : {}),
      }),
      signal,
    });
    const data = await r.json();
    if (typeof data.research?.resolvedQuestion === "string" && data.research.resolvedQuestion.length <= 500)
      resolvedQuestion = data.research.resolvedQuestion;
    if (!r.ok) {
      if (r.status === 503 && data.retryFromStart === true && typeof data.error === "string")
        return { data, status: r.status };
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
    if (data.research && resolvedQuestion) data.research.resolvedQuestion = resolvedQuestion;
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
    input.onProgress({ ...progress, ...(resolvedQuestion ? { resolvedQuestion } : {}) });
    if (
      ["complete", "unresolved", "failed", "cancelled"].includes(progress.stage)
    ) {
      const answer = await post(jobId);
      if (answer.status !== 202) return answer.data;
      input.onProgress(answer.data.research);
    }
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
