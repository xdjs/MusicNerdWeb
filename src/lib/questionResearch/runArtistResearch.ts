import { getAccessToken } from "@privy-io/react-auth";
import { musicNerdApiUrl } from "@/lib/musicNerdApi/musicNerdApiUrl";
import { fetchResearchResponse } from "./fetchResearchResponse";
import type { PublicChatTurn } from "./publicChatTypes";
import { getQuestionQuota, type QuestionQuota } from './getQuestionQuota';
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
  quota?: QuestionQuota;
  sources?: unknown[];
  suggestions?: unknown[];
  mentions?: unknown[];
  songs?: unknown[];
  instagramMentions?: unknown[];
  bandcamp?: string | null;
  fromOpenWeb?: boolean;
  webDomains?: unknown[];
};
/**
 * One explicit question starts work; subsequent polls and reconnects reuse its durable job.
 * Every call goes to MusicNerdAPI. A new question carries the Privy token when signed in, so the
 * hourly allowance counts per account; signed out, the API counts it per IP.
 */
export async function runArtistResearch(input: {
  artistId: string;
  question: string;
  conversation?: PublicChatTurn[];
  resolvedQuestion?: string;
  jobId?: string;
  signal: AbortSignal;
  onProgress: (progress: ResearchProgress) => void;
  onCooldown?: (seconds: number | null) => void;
}): Promise<QuestionAnswer> {
  const signal = AbortSignal.any([
    input.signal,
    AbortSignal.timeout(5 * 60_000),
  ]);
  let resolvedQuestion = input.resolvedQuestion;
  const post = async (jobId?: string) => {
    const url = musicNerdApiUrl(jobId
      ? `/api/artist/${encodeURIComponent(input.artistId)}/questionResearch/${encodeURIComponent(jobId)}/answer`
      : "/api/askArtist");
    const token = jobId ? null : await getAccessToken().catch(() => null);
    const r = await fetchResearchResponse(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "omit",
      body: JSON.stringify({
        ...(!jobId ? { artistId: input.artistId } : {}),
        question: jobId ? resolvedQuestion ?? input.question : input.question,
        ...(!jobId && input.conversation?.length ? { conversation: input.conversation } : {}),
      }),
      signal,
    }, input.onCooldown);
    const data = await r.json();
    const quota = getQuestionQuota(data, r.headers);
    if (quota) return { data: { ...data, quota }, status: r.status };
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
  let jobId = first.data.research?.jobId;
  if (typeof jobId !== "string") throw new Error("Research job unavailable");
  input.onProgress(first.data.research);
  // A complete acknowledgement is not an answer, but its result endpoint performs
  // current eligibility checks itself. Avoid an extra full-corpus status read.
  if (first.data.research.stage === "complete" && !input.jobId) {
    const answer = await post(jobId);
    if (answer.status !== 202) return answer.data;
    if (typeof answer.data.research?.jobId === "string") jobId = answer.data.research.jobId;
    input.onProgress(answer.data.research);
  }
  for (;;) {
    signal.throwIfAborted();
    const r = await fetchResearchResponse(
      musicNerdApiUrl(`/api/artist/${input.artistId}/questionResearch/${encodeURIComponent(jobId)}`),
      { signal, cache: "no-store", credentials: "omit" },
      input.onCooldown,
    );
    const progress = await r.json();
    const quota = getQuestionQuota(progress, r.headers);
    if (quota) return { ...progress, quota };
    if (!r.ok)
      throw new Error(progress.error ?? "Research could not be checked.");
    input.onProgress({ ...progress, ...(resolvedQuestion ? { resolvedQuestion } : {}) });
    if (
      ["complete", "unresolved", "failed", "cancelled"].includes(progress.stage)
    ) {
      const answer = await post(jobId);
      if (answer.status !== 202) return answer.data;
      if (typeof answer.data.research?.jobId === "string") jobId = answer.data.research.jobId;
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
