import { APIFY_API_TOKEN } from "@/env";
const APIFY_CONTROL_TIMEOUT_MS = 20_000;
const APIFY_ACTOR_RUNS_URL = "https://api.apify.com/v2/actor-runs";
import type { ApifyRunState } from "../socialIngest";

/**
 * Where a started Apify run has got to.
 *
 * @param runId - The run.
 * @returns "ready" with its dataset, "running", or "failed" with a reason.
 */
export async function checkInstagramScrape(runId: string): Promise<ApifyRunState> {
  const token = APIFY_API_TOKEN;
  if (!token) return { status: "failed", reason: "no apify token" };
  try {
    const res = await fetch(`${APIFY_ACTOR_RUNS_URL}/${runId}?token=${encodeURIComponent(token)}`, {
      signal: AbortSignal.timeout(APIFY_CONTROL_TIMEOUT_MS),
    });
    if (!res.ok) return { status: "failed", reason: `apify status ${res.status}`,
      ...([408, 429].includes(res.status) || res.status >= 500 ? { retryable: true } : {}),
    };
    const body = (await res.json()) as { data?: { status?: string; defaultDatasetId?: string } };
    const state = body?.data?.status;
    const datasetId = body?.data?.defaultDatasetId;
    if (state === "SUCCEEDED" && typeof datasetId === "string" && datasetId.length > 0) return { status: "ready", runId, datasetId };
    if (["READY", "RUNNING", "TIMING-OUT", "ABORTING"].includes(state ?? "")) return { status: "running", runId };
    if (["FAILED", "TIMED-OUT", "ABORTED"].includes(state ?? "")) {
      return { status: "failed", reason: `apify run ${state}` };
    }
    return { status: "failed", reason: "apify status invalid response", retryable: true };
  } catch {
    return { status: "failed", reason: "apify status unavailable", retryable: true };
  }
}
