import { z } from "zod";
import { MUSICNERD_API_INTERVIEWER_ENABLED } from "@/env";
import { MUSICNERD_API_URL } from "@/lib/musicNerdApi/const";
import { interviewRequestSchema } from "@/lib/interviewApi/interviewRequestSchema";
import { interviewSessionStateSchema } from "@/lib/interviewApi/sessionSchemas";
import { readInterviewWebBody } from "./readInterviewWebBody";
import { callInterviewApi } from "./callInterviewApi";
import { fetchMandatoryInterviewMemory } from "./fetchMandatoryInterviewMemory";
import { fetchArtistKnowledge } from "./fetchArtistKnowledge";
import { generateApiInterviewQuestion } from "./generateApiInterviewQuestion";
/** Web owns the journalist; every private memory/source/session operation goes through MusicNerdAPI. */
export async function handleApiInterview(request: Request, artistId: string) {
  const headers = { "Cache-Control": "private, no-store" };
  const reply = (body: unknown, status = 200) =>
    Response.json(body, { status, headers });
  if (!MUSICNERD_API_INTERVIEWER_ENABLED)
    return reply({ error: "This interview preview is not enabled." }, 503);
  if (!z.string().uuid().safeParse(artistId).success)
    return reply({ error: "Invalid artist." }, 400);
  const authorization = request.headers.get("authorization");
  if (
    !authorization ||
    authorization.length > 8192 ||
    !/^Bearer [A-Za-z0-9._~+/=-]+$/.test(authorization)
  )
    return reply({ error: "Sign in to continue the interview." }, 401);
  const config = {
    apiOrigin: MUSICNERD_API_URL,
    artistId,
    getAccessToken: async () => authorization.slice(7),
  };
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(105000)]);
  const restore = async () =>
    interviewSessionStateSchema.parse(
      await callInterviewApi(config, "session", { signal }),
    );
  try {
    if (new URL(request.url).search)
      return reply({ error: "Unexpected interview query." }, 400);
    if (request.method === "GET") return reply(await restore());
    if (request.method !== "POST")
      return reply({ error: "Method unavailable." }, 405);
    const parsed = interviewRequestSchema.safeParse(
      await readInterviewWebBody(request),
    );
    if (!parsed.success)
      return reply({ error: "Invalid interview request." }, 400);
    const input = parsed.data;
    if (input.action === "source")
      return reply(
        await fetchArtistKnowledge(
          config,
          "read",
          {
            sourceId: input.sourceId,
            revision: input.revision,
            start: Math.max(0, input.start - 1000),
            maxChars: 8000,
          },
          signal,
        ),
      );
    if (input.action === "memory" || input.action === "boundaries") {
      const state = await restore();
      const sitting =
        state.session?.state === "active"
          ? state.session.sitting
          : (state.legacyOffers[0]?.sitting ??
            (state.session?.sitting ?? 0) + 1);
      if (input.action === "boundaries")
        return reply(
          await callInterviewApi(config, "boundaries", {
            query: {
              sitting,
              ...(input.cursor ? { cursor: input.cursor } : {}),
            },
            signal,
          }),
        );
      return reply(
        await fetchMandatoryInterviewMemory(config, sitting, signal),
      );
    }
    if (input.action === "boundary") {
      const { action, ...body } = input;
      void action;
      await callInterviewApi(config, "boundaries", { body, signal });
      return reply({ status: "ok" });
    }
    if (input.action === "retract") {
      await callInterviewApi(config, `boundaries/${input.boundaryId}/retract`, {
        body: { revision: input.revision },
        signal,
      });
      return reply({ status: "ok" });
    }
    if (input.action === "answer") {
      await callInterviewApi(config, `answers/${input.answerId}`, {
        body: {
          expectedRevision: input.expectedRevision,
          answer: input.answer,
        },
        signal,
      });
      return reply(await restore());
    }
    if (input.action === "finish") {
      await callInterviewApi(config, `session/${input.sessionId}/finish`, {
        body: {},
        signal,
      });
      return reply(await restore());
    }
    const state =
      input.action === "start"
        ? interviewSessionStateSchema.parse(
            await callInterviewApi(config, "session", {
              body: { requestId: input.requestId },
              signal,
            }),
          )
        : await restore();
    const session = state.session;
    if (
      !session ||
      session.state !== "active" ||
      state.legacyOffers.length ||
      ("sessionId" in input && session.id !== input.sessionId)
    )
      return reply(
        { error: "Reload the saved interview before continuing." },
        409,
      );
    if (session.questions.some((q) => q.state === "offered"))
      return reply(state);
    if (session.questions.length >= 3)
      return reply(
        { error: "This sitting is complete. Finish to save it." },
        409,
      );
    const prepared = await generateApiInterviewQuestion(
      config,
      session.sitting,
      signal,
    );
    await callInterviewApi(config, `session/${session.id}/offer`, {
      body: {
        ordinal: session.questions.length + 1,
        question: prepared.question,
        references: prepared.references,
        memorySnapshotId: prepared.memorySnapshotId,
      },
      signal,
    });
    return reply(await restore());
  } catch (error) {
    const contextTooLarge =
      error instanceof Error &&
      [
        "Mandatory memory exceeds its context budget",
        "Mandatory memory exceeds its page budget",
        "Mandatory memory response exceeds its byte budget",
        "Mandatory memory API returned HTTP 413; restart after 409, sign in after 401",
        "Prior interview history exceeds its page budget",
        "Prior interview history exceeds its response budget",
        "Prior questions exceed their model context budget",
        "Interview check exceeds its context budget",
      ].includes(error.message);
    const candidate =
      typeof error === "object" && error && "status" in error
        ? error.status
        : undefined;
    const status =
      typeof candidate === "number" &&
      [400, 401, 403, 404, 409, 413, 429].includes(candidate)
        ? candidate
        : 503;
    return reply(
      {
        error:
          status === 401
            ? "Sign in to continue the interview."
            : status === 403
              ? "This account cannot edit this artist."
              : status === 409
                ? "The interview changed. Reload the saved interview."
                : status === 400
                  ? "Invalid interview request."
                  : contextTooLarge
                    ? "I cannot safely prepare another question with all the saved context yet. Your saved answers remain available, and you can still review or remove topic instructions in Topic preferences."
                    : "I could not complete that interview step. Your saved interview is still available; reload and try again.",
      },
      status,
    );
  }
}
