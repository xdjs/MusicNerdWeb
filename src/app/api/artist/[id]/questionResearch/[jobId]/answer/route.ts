import { z } from "zod";
import { questionRequestSchema } from "@/lib/questionResearch/questionRequestSchema";
import { handleArtistQuestion } from "@/server/utils/questionResearch/handleArtistQuestion";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Collect only an existing public job's registered answer; never start new research. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; jobId: string }> },
) {
  const headers = { "Cache-Control": "private, no-store" };
  const params = z.object({ id: z.string().uuid(), jobId: z.string().uuid() })
    .safeParse(await context.params);
  if (!params.success)
    return Response.json({ error: "Invalid research job" }, { status: 400, headers });
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 18000) throw new Error("Oversized request");
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid question" }, { status: 400, headers });
  }
  const question = questionRequestSchema.pick({ question: true }).safeParse(body);
  if (!question.success)
    return Response.json({ error: "Invalid question" }, { status: 400, headers });
  // URL scope is authoritative. The shared handler skips planning/registration
  // for jobId and enforces the saved artist/job/question and drafting lease.
  return handleArtistQuestion(new Request(request.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ artistId: params.data.id, jobId: params.data.jobId, question: question.data.question }),
    signal: request.signal,
  }));
}
