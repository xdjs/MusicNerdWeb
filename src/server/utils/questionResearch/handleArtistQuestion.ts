import { continueCandidateResearch } from "./continueCandidateResearch";
import { continueQuestionResearch } from "./continueQuestionResearch";
import { listReusableQuestionCandidates } from "./listReusableQuestionCandidates";
import { hasCompatibleReuseScope } from "@/lib/questionResearch/hasCompatibleReuseScope";
import { releaseQuestionRequest } from "./releaseQuestionRequest";
import { reuseQuestionRequest } from "./reuseQuestionRequest";
import { bindQuestionRequest } from "./bindQuestionRequest";
import { reserveQuestionPlanning } from "./reserveQuestionPlanning";
import { questionRequestSchema } from "@/lib/questionResearch/questionRequestSchema";
import { getArtistById } from "@/server/utils/queries/artistQueries";
import { planArtistQuestion } from "./planArtistQuestion";
import { callResearchApi } from "./callResearchApi";
import { getOrDraftResearchAnswer } from "./getOrDraftResearchAnswer";
import { registerResearchQuestion } from "./registerResearchQuestion";
import { researchStatusSchema } from "@/lib/questionResearch/schemas";
/** Public chat is limited to the API's public evidence capability; private history is never loaded. */
export async function handleArtistQuestion(request: Request) {
  const signal = AbortSignal.any([...(request.signal ? [request.signal] : []), AbortSignal.timeout(55000)]);
  const headers = { "Cache-Control": "private, no-store" };
  let requestLease: { artistId: string; requestHash: string; token: string } | undefined;
  try {
    const raw = await request.text();
    if (raw.length > 18000)
      return Response.json(
        { error: "Question too long" },
        { status: 400, headers },
      );
    let input: unknown;
    try {
      input = JSON.parse(raw);
    } catch {
      return Response.json(
        { error: "Invalid question" },
        { status: 400, headers },
      );
    }
    const parsed = questionRequestSchema.safeParse(input);
    if (!parsed.success)
      return Response.json(
        { error: "Invalid artist or question" },
        { status: 400, headers },
      );
    const { artistId, question, jobId, conversation } = parsed.data;
    const artist = await getArtistById(artistId);
    if (!artist)
      return Response.json(
        { error: "Artist not found" },
        { status: 404, headers },
      );
    const name = artist.name ?? "This artist";
    const reuse = jobId ? null : await reuseQuestionRequest({ artistId, artistName: name, question, conversation, signal });
    if (reuse?.state === "ready") return Response.json({
      ...reuse.result,
      bandcamp: artist.bandcamp ? `https://${artist.bandcamp}.bandcamp.com` : null,
      limitations: reuse.limitations,
    }, { headers });
    if (reuse?.state === "busy") throw Object.assign(new Error("An identical request is already running"), { status: 429, code: "research_busy" });
    if (reuse?.state === "claimed") requestLease = { artistId, requestHash: reuse.requestHash, token: reuse.token };
    if (!jobId) await reserveQuestionPlanning(artistId);
    const candidates = jobId ? [] : await listReusableQuestionCandidates(artistId);
    const plan = jobId
      ? null
      : await planArtistQuestion(name, question, signal, conversation, candidates);
    if (typeof plan?.clarification === "string") return Response.json({
      answer: plan.clarification, sources: [], suggestions: [],
    }, { headers });
    const { resolvedQuestion: resolved = question, answerIntent, reuseCandidateId, reuseAction, ...routing } = plan ?? {};
    const resolvedQuestion = typeof resolved === "string" ? resolved : question;
    const candidate = typeof reuseCandidateId === "string"
      ? candidates.find(c => c.id === reuseCandidateId && hasCompatibleReuseScope(routing, c, String(reuseAction))) : undefined;
    if (candidate && reuse?.state === "claimed" && typeof answerIntent === "string"
      && ["same_answer","adapt_evidence"].includes(String(reuseAction))) {
      const current = researchStatusSchema.parse(await callResearchApi(
        `/api/artist/${artistId}/research/questions/${candidate.jobId}`, { signal },
      ));
      if (current.stage === "complete") {
        const checked = await getOrDraftResearchAnswer({
          artistId, artistName:name, jobId:candidate.jobId, question:resolvedQuestion,
          references:current.references, selection:current.selection, signal, readOnlyQuestionHash:candidate.questionHash,
        });
        if (checked.state === "ready" && checked.result.sources.length > 0
          && await registerResearchQuestion(artistId, candidate.jobId, resolvedQuestion)) {
          // Planning and checked-answer generation have separate bounded requests.
          // A semantic match selects evidence; it does not approve a new answer.
          await bindQuestionRequest({ artistId, requestHash: reuse.requestHash, token: reuse.token,
            jobId: candidate.jobId, question: resolvedQuestion, reusable: true, answerIntent,
            routing: { ...routing, reuseFallbackJobId: candidate.jobId } });
          return Response.json({ research: {
            jobId: candidate.jobId, resolvedQuestion, stage: "complete",
            message: "Checking the sourced answer…", provider: current.provider,
          } }, { status: 202, headers });
        }
      }
    }
    const state = researchStatusSchema.parse(
      jobId
        ? await callResearchApi(
            `/api/artist/${artistId}/research/questions/${jobId}`,
            { signal },
          )
        : await callResearchApi(`/api/artist/${artistId}/research/questions`, {
            body: { ...routing, preferDirectEvidence: true },
            signal,
          }),
    );
    if (
      !jobId &&
      !(await registerResearchQuestion(artistId, state.jobId, resolvedQuestion))
    )
      return Response.json(
        {
          error:
            "This saved research has reached its answer limit. Try a different question later.",
        },
        { status: 429, headers },
      );
    if (reuse?.state === "claimed") await bindQuestionRequest({
      artistId, requestHash: reuse.requestHash, token: reuse.token,
      jobId: state.jobId, question: resolvedQuestion,
      answerIntent: typeof answerIntent === "string" ? answerIntent : undefined, routing,
      // An original remaining readable does not prove it is still the newest.
      reusable: routing.retrieval !== "latest" && routing.freshness !== "recent"
        && !routing.fromDate && !routing.toDate,
    });
    if (
      !jobId ||
      !["complete", "unresolved", "failed", "cancelled"].includes(state.stage)
    )
      return Response.json(
        {
          research: {
            jobId: state.jobId,
            resolvedQuestion,
            outsideResearchReason: state.outsideResearchReason,
            stage: state.stage,
            message: state.message,
            provider: state.provider,
          },
        },
        { status: 202, headers },
      );
    if (state.stage === "failed" || state.stage === "cancelled")
      return Response.json(
        { error: "I couldn't finish that lookup. Please try again.", retryFromStart: true },
        { status: 503, headers },
      );
    if (state.stage !== "complete")
      return Response.json(
        {
          answer:
            state.stage === "unresolved"
              ? state.outsideResearchReason === "quota"
                ? "The saved sources I checked did not answer that. Outside research is at its limit, so I could not look further."
                : state.limitations.includes("provider_latest_refresh_required")
                  ? "I don't have enough saved information from that source, and I can't refresh it from this chat yet."
                  : state.limitations.includes("connected_account_required")
                    ? "I need a connected account for that source before I can check it."
                    : "I don't have enough information to answer that yet."
              : "Research could not finish. That does not mean the information doesn't exist.",
          sources: [],
          suggestions: [],
          research: {
            jobId: state.jobId,
            resolvedQuestion,
            outsideResearchReason: state.outsideResearchReason,
            stage: state.stage,
            message: state.message,
          },
          limitations: state.limitations,
        },
        { headers },
      );
    try {
      const outcome = await getOrDraftResearchAnswer({
        artistId,
        artistName: name,
        jobId: state.jobId,
        question: resolvedQuestion,
        references: state.references,
        selection: state.selection,
        signal,
      });
      if (outcome.state === "continuing" || (state.selection === "candidates"
        && outcome.state === "ready" && outcome.result.sources.length === 0)) {
        const continued = await continueCandidateResearch({ artistId, jobId: state.jobId, question: resolvedQuestion, signal });
        return Response.json({ research: {
          jobId: state.jobId, resolvedQuestion,
          stage: "pending" in continued ? "complete" : continued.stage,
          message: "Checking Lore…",
        } }, { status: 202, headers });
      }
      if (outcome.state === "drafting")
        return Response.json(
          {
            research: {
              jobId: state.jobId,
              stage: "complete",
              message: "Checking the sourced answer…",
              provider: state.provider,
            },
          },
          { status: 202, headers },
        );
      if (outcome.state === "unregistered")
        return Response.json(
          {
            error:
              "This question is not attached to the saved research. Start a new question.",
          },
          { status: 409, headers },
        );
      if (outcome.state === "unavailable")
        return Response.json(
          {
            answer:
              "The saved answer's supporting source is no longer available. I cannot verify it now.",
            sources: [],
            suggestions: [],
            research: {
              jobId: state.jobId,
              stage: "unresolved",
              message: "Source access changed.",
            },
          },
          { headers },
        );
      if (outcome.state === "failed")
        return Response.json(
          {
            error: outcome.retryable
              ? "I could not verify an answer from those originals. You can retry shortly."
              : "I could not verify an answer from those originals after several checks.",
            jobId: state.jobId,
            verification: {
              stage: outcome.stage,
              retryable: outcome.retryable,
            },
          },
          { status: 503, headers },
        );
      if (!outcome.result.sources.length) {
        const continued = await continueQuestionResearch({ artistId, jobId: state.jobId, question: resolvedQuestion, signal });
        if (continued && "pending" in continued) return Response.json({ research: {
          jobId: state.jobId, resolvedQuestion, stage: "complete", message: "Checking the sourced answer…",
        } }, { status: 202, headers });
        if (continued) return Response.json({ research: {
          jobId: continued.jobId, resolvedQuestion, stage: continued.stage,
          message: continued.message, provider: continued.provider,
          outsideResearchReason: continued.outsideResearchReason,
        } }, { status: 202, headers });
      }
      return Response.json(
        {
          ...outcome.result,
          bandcamp: artist.bandcamp
            ? `https://${artist.bandcamp}.bandcamp.com`
            : null,
          limitations: state.limitations,
        },
        { headers },
      );
    } catch {
      return Response.json(
        {
          error:
            "I could not verify an answer from those originals. You can retry the saved research.",
          jobId: state.jobId,
        },
        { status: 503, headers },
      );
    }
  } catch (error) {
    const status =
      typeof error === "object" &&
      error &&
      "status" in error &&
      error.status === 429
        ? 429
        : 503;
    const code =
      error && typeof error === "object" && "code" in error
        ? error.code
        : undefined;
    return Response.json(
      {
        code,
        error:
          code === "question_planning_quota"
            ? "The question limit has been reached. Please try again later."
            : code === "saved_evidence_quota"
              ? "The saved-source answer limit has been reached. Please try again later."
              : code === "research_busy"
                ? "Research is busy right now. Please try again shortly."
                : status === 429
                  ? "The research limit has been reached. Try again later."
                  : "Research is temporarily unavailable. Please try again.",
      },
      { status, headers },
    );
  } finally {
    if (requestLease) await releaseQuestionRequest(requestLease.artistId, requestLease.requestHash, requestLease.token).catch(() => undefined);
  }
}