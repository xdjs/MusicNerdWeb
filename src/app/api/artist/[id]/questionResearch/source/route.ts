import { z } from "zod";
import { callResearchApi } from "@/server/utils/questionResearch/callResearchApi";
import {
  referenceSchema,
  researchReadSchema,
} from "@/lib/questionResearch/schemas";
export const dynamic = "force-dynamic";
/** Read a current public citation through the same access/revision boundary as research. */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const headers = { "Cache-Control": "private, no-store" };
  const { id } = await context.params;
  const q = z
    .object({
      sourceId: referenceSchema.shape.sourceId,
      revision: referenceSchema.shape.revision,
      start: z.coerce.number().int().min(0).max(4000000).default(0),
    })
    .strict()
    .safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!z.string().uuid().safeParse(id).success || !q.success)
    return Response.json(
      { error: "Invalid source reference" },
      { status: 400, headers },
    );
  try {
    const { sourceId, revision, start } = q.data;
    const body = researchReadSchema.parse(
      await callResearchApi(
        `/api/artist/${id}/research/evidence/${encodeURIComponent(sourceId)}?revision=${revision}&start=${start}&maxChars=12000`,
        { signal: request.signal },
      ),
    );
    return Response.json(body, { headers });
  } catch {
    return Response.json(
      {
        error:
          "This original changed or is no longer available. Refresh the research.",
      },
      { status: 409, headers },
    );
  }
}
