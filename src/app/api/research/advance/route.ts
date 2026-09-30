/**
 * The scheduler for `latest_refresh`, the one research kind this repo still runs.
 *
 * MusicNerdAPI (xdjs/MusicNerdAPI) runs the rest of the queue since the #1365
 * cutover: `social_ingest`, `caption_extract`, `lore_refresh` and
 * `source_search`, with its own cron, and the browser pump posts there. Update
 * Latest queues `latest_refresh` and pumps it through
 * `/api/artist/[id]/latest-refresh/advance`; this GET finishes the ones nobody
 * is watching. Both workers claim from the same queue under a lease, so they
 * never take the same job.
 */
import { advanceResearch } from "@/server/utils/researchRunner";
import { CRON_SECRET } from "@/env";
import type { JobKind } from "@/server/utils/queries/researchJobQueries";

export const dynamic = "force-dynamic";
/** The whole point. A slice gets its own allowance rather than a chat turn's
 *  leftovers. 60 is the ceiling on the current plan. */
export const maxDuration = 60;

/** Held back so the response is sent rather than the platform cutting us off
 *  mid-write. */
const RESPONSE_RESERVE_MS = 4_000;

/**
 * The scheduler's entry point. Vercel cron issues a GET.
 *
 * Takes SLICES UNTIL THE BUDGET RUNS OUT rather than one and stopping. A tick
 * that does a single slice and waits a minute for the next would take half an
 * hour to read a three-hundred-post feed; there is a whole invocation here and
 * the queue is the thing that decides what to work on, so it keeps claiming
 * while there is time to finish something.
 *
 * It stops the moment a claim comes back empty — an idle queue must cost one
 * database round trip per tick, not a minute of spinning.
 */
export async function GET(req: Request): Promise<Response> {
    const started = Date.now();
    // Only when a secret is configured. Unset, it stays open, which keeps
    // local and preview environments working; set, it
    // is required, so production cannot be pumped by anyone who finds the URL.
    if (CRON_SECRET && req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
        return Response.json({ ran: false, error: "unauthorized" }, { status: 401 });
    }

    const deadline = started + maxDuration * 1000 - RESPONSE_RESERVE_MS;
    const slices: unknown[] = [];
    // A WAITING JOB IS SET ASIDE FOR THE REST OF THE TICK. An ingest polling an
    // Apify run hands its lease straight back and the queue orders by age, so
    // the loop would otherwise reclaim that same job and poll the scrape until
    // the invocation expired — hammering the provider and starving every job
    // behind it. The next tick a minute later picks it up, which is the right
    // cadence for something that takes one to five minutes anyway.
    //
    // Only WAITING jobs. A job that read a batch of captions made progress and
    // should keep the invocation: taking several extraction slices per tick is
    // the reason this loops at all.
    const waiting: string[] = [];
    try {
        // A slice needs room to do something and to write down what it did.
        // Starting one with eight seconds left spends the reserve and keeps
        // nothing, which is the same rule extractCaptionCredits applies inside
        // itself.
        while (Date.now() < deadline - MIN_SLICE_MS) {
            // A copy, not the live array — the callee must not be holding a
            // reference to a list this loop keeps appending to.
            const result = await advanceResearch({ budgetMs: deadline - Date.now(), excludeJobIds: [...waiting], kinds: LATEST_ONLY });
            if (!result.ran) break;
            if (result.waiting && result.jobId) waiting.push(result.jobId);
            slices.push(result);
        }
        console.debug(`[research/advance] cron ran ${slices.length} slice(s) in ${Date.now() - started}ms`);
        return Response.json({ ran: slices.length > 0, slices });
    } catch (e) {
        console.error("[research/advance] cron error:", e);
        return Response.json({ ran: slices.length > 0, slices, error: "advance failed" });
    }
}

/** MusicNerdAPI runs every other kind. */
const LATEST_ONLY: JobKind[] = ["latest_refresh"];

/** Below this there is not enough left for a model call and the write after it. */
const MIN_SLICE_MS = 12_000;
