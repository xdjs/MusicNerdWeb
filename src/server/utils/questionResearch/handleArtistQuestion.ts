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
  const headers = { "Cache-Control": "private, no-store" };
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
    if (!jobId) await reserveQuestionPlanning(artistId);
    const plan = jobId
      ? null
      : await planArtistQuestion(name, question, request.signal, conversation);
    const { resolvedQuestion: resolved = question, ...routing } = plan ?? {};
    const resolvedQuestion = typeof resolved === "string" ? resolved : question;
    const state = researchStatusSchema.parse(
      jobId
        ? await callResearchApi(
            `/api/artist/${artistId}/research/questions/${jobId}`,
            { signal: request.signal },
          )
        : await callResearchApi(`/api/artist/${artistId}/research/questions`, {
            body: routing,
            signal: request.signal,
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
                    : "I could not establish that from the sources I could read."
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
        signal: request.signal,
      });
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
  }
}
