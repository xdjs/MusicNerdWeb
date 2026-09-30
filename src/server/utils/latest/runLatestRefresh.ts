import type { ResearchJob } from "../queries/researchJobQueries";
import { LATEST_SOURCES, type LatestRefreshState } from "@/lib/latest/types";
import { latestRefreshStore } from "./latestRefreshStore";
import { refreshLatestSource } from "./refreshLatestSource";
import { refreshLatestInstagram } from "./refreshLatestInstagram";

/** Collection only. No extraction, discovery, Lore or About calls. */
export async function runLatestRefresh(job: ResearchJob, deadline: number) {
  const state = job.state as unknown as LatestRefreshState;
  // Each bounded provider gets a separate slice; partial failures do not erase successes.
  for (const source of LATEST_SOURCES.filter((s) => s !== "instagram")) {
    if (state.sources[source].status !== "pending") continue;
    if (deadline - Date.now() < 15000) break;
    try {
      state.sources[source] = await refreshLatestSource(job, source);
    } catch {
      state.sources[source] = { status: "failed" };
    }
    await latestRefreshStore(job, state);
  }
  if (
    state.sources.instagram.status === "pending" &&
    deadline - Date.now() > 45000
  ) {
    state.sources.instagram = await refreshLatestInstagram(job, deadline);
  }
  const done = LATEST_SOURCES.every(
    (s) => state.sources[s].status !== "pending",
  );
  await latestRefreshStore(job, state, done);
  return {
    done,
    waiting: !done,
    progress: done ? "Latest check finished" : "Checking connected sources",
  };
}
