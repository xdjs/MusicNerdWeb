import { handleApiInterview } from "@/server/utils/interviewApi/handleApiInterview";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
/** Restore only saved interview state. */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleApiInterview(request, (await context.params).id);
}
/** Explicit artist action; question generation reads and persists through the shared API. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleApiInterview(request, (await context.params).id);
}
