import type { ResearchJob } from "../queries/researchJobQueries";
import type { LatestRefreshState, SourceResult } from "@/lib/latest/types";
import { APIFY_API_TOKEN } from "@/env";
import { checkInstagramScrape, collectInstagramScrape } from "../socialIngest";
import { latestRefreshStore } from "./latestRefreshStore";
import { startLatestInstagramScrape } from "./startLatestInstagramScrape";

/** Resume only the saved provider run. A lost start response never starts another. */
export async function refreshLatestInstagram(
  job: ResearchJob,
  deadline: number,
): Promise<SourceResult> {
  const state = job.state as unknown as LatestRefreshState;
  const handle = state.instagram?.trim().replace(/^@/, "");
  if (!handle) return { status: "disconnected" };
  if (!APIFY_API_TOKEN) return { status: "failed" };
  if (!state.runId) {
    if (state.providerStarted) return { status: "failed" };
    state.providerStarted = true;
    await latestRefreshStore(job, state);
    const runId = await startLatestInstagramScrape(handle);
    if (!runId) return { status: "failed" };
    state.runId = runId;
    await latestRefreshStore(job, state);
    return { status: "pending" };
  }
  const result = state.datasetId
    ? { status: "ready" as const, datasetId: state.datasetId }
    : await checkInstagramScrape(state.runId);
  if (result.status === "failed") {
    state.instagramFailure = {phase: "status", reason: result.reason, at: new Date().toISOString()};
    await latestRefreshStore(job, state);
    if (result.retryable) throw new Error(result.reason);
    return { status: "failed" };
  }
  if (result.status !== "ready") return { status: "pending" };
  state.datasetId = result.datasetId;
  await latestRefreshStore(job, state);
  if (deadline - Date.now() < 45000) return { status: "pending" };
  const collected = await collectInstagramScrape(
    job.artistId,
    handle,
    result.datasetId,
    job.id,
    0,
    { latestOnly: true },
  );
  if (!collected) {
    const reason = "Instagram collection unavailable";
    state.instagramFailure = {phase: "collection", reason, at: new Date().toISOString()};
    await latestRefreshStore(job, state);
    throw new Error(reason);
  }
  return { status: "checked", checkedAt: new Date().toISOString() };
}
