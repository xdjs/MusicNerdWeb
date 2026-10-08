import { z } from "zod";
import { callResearchApi } from "@/server/utils/questionResearch/callResearchApi";
import { researchStatusSchema } from "@/lib/questionResearch/schemas";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
/** Resume existing bounded work, then return actual progress without exposing job scratch. */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; jobId: string }> },
) {
  const headers = { "Cache-Control": "private, no-store" };
  const params = z
    .object({ id: z.string().uuid(), jobId: z.string().uuid() })
    .safeParse(await context.params);
  if (!params.success)
    return Response.json(
      { error: "Invalid research job" },
      { status: 400, headers },
    );
  const { id, jobId } = params.data;
  try {
    const path = `/api/artist/${id}/research/questions/${jobId}`;
    let state = researchStatusSchema.parse(
      await callResearchApi(path, { signal: request.signal }),
    );
    if (
      !["complete", "unresolved", "failed", "cancelled"].includes(state.stage)
    ) {
      await callResearchApi("/api/research/advance", {
        body: { artistId: id, kinds: ["question_research"] },
        signal: request.signal,
      });
      state = researchStatusSchema.parse(
        await callResearchApi(path, { signal: request.signal }),
      );
    }
    return Response.json(
      {
        jobId: state.jobId,
        stage: state.stage,
        provider: state.provider,
        message: state.message,
        retryAfterMs: 5000,
      },
      { headers },
    );
  } catch {
    return Response.json(
      { error: "Research could not be checked. The saved job can be resumed." },
      { status: 503, headers },
    );
  }
}
