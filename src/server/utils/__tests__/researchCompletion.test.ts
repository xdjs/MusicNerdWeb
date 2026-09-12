// @ts-nocheck
/**
 * How an extraction job ENDS.
 *
 * Found by running the queue with several workers against a real artist:
 * Pharaoh Sistare read every one of his captions, stored every credit, and was
 * then marked `failed` after four attempts. `refreshArtistDoc` returned false
 * because he has no document to rebuild, and the runner could not tell that
 * apart from a rebuild that broke. Every artist onboarding for the first time
 * is in exactly that state, so this was the common case, not an edge.
 */
import { jest } from "@jest/globals";

const refreshArtistDoc = jest.fn();
const completeResearchJob = jest.fn(async () => {});
const failResearchJob = jest.fn(async () => {});
const saveJobProgress = jest.fn(async () => {});
const saveJobState = jest.fn(async () => {});
const failJobAtCursor = jest.fn(async () => {});
const claimResearchJob = jest.fn();

jest.mock("@/server/utils/artistDocService", () => ({
    refreshArtistDoc: (...a) => refreshArtistDoc(...a),
    buildDocSources: jest.fn(async () => []),
}));
jest.mock("@/server/utils/queries/researchJobQueries", () => ({
    claimResearchJob: (...a) => claimResearchJob(...a),
    completeResearchJob: (...a) => completeResearchJob(...a),
    failResearchJob: (...a) => failResearchJob(...a),
    saveJobProgress: (...a) => saveJobProgress(...a),
    saveJobState: (...a) => saveJobState(...a),
    failJobAtCursor: (...a) => failJobAtCursor(...a),
    enqueueResearchJob: jest.fn(async () => true),
    reopenResearchJob: jest.fn(async () => {}),
    getResearchJobs: jest.fn(async () => []),
    isResearchComplete: jest.fn(async () => false),
    MAX_ATTEMPTS: 4,
}));

// One post, already read, already swept. This suite is only about the last step.
const POST = {
    platform: "instagram", platformPostId: "1", ownerUsername: "artist", isOwnPost: true,
    caption: "Mixed by @someone.", url: "https://www.instagram.com/p/P1/",
    postedAt: "2026-01-01T00:00:00.000Z", likeCount: 1, commentCount: 0, playCount: null,
    hashtags: [], mentions: [], coauthors: [], musicTitle: null, musicArtist: null,
};
jest.mock("@/server/utils/socialIngest", () => ({
    instagramHandleFor: jest.fn(async () => "artist"),
    hasSocialPosts: jest.fn(async () => true),
    getSocialPostsOrNull: jest.fn(async () => [POST]),
    startInstagramScrape: jest.fn(),
    checkInstagramScrape: jest.fn(),
    collectInstagramScrape: jest.fn(),
}));
jest.mock("@/server/utils/socialCredits", () => ({
    extractCaptionCredits: jest.fn(async () => ({
        done: true, nextBatch: 1, totalBatches: 1,
        extraction: { credits: [], statements: [] }, failed: false,
    })),
    sweepSilentCaptions: jest.fn(async () => ({
        done: true, nextBatch: 0, totalBatches: 0, failed: false,
        extraction: { credits: [], statements: [] },
    })),
}));
jest.mock("@/server/utils/queries/socialCreditQueries", () => ({
    clearSocialCredits: jest.fn(async () => {}),
    appendSocialCredits: jest.fn(async () => 0),
    claimedSourceUrls: jest.fn(async () => new Set()),
}));
jest.mock("@/server/utils/questionGenerator", () => ({ forgetGroundedQuestions: jest.fn() }));

const job = {
    id: "job-1", artistId: "artist-1", kind: "caption_extract",
    status: "running", cursor: 0, total: null, attempts: 0,
    // Already swept, so the run goes straight to the rebuild — the step under
    // test. mode "full" means no baseline filtering.
    state: { mode: "full", swept: true }, updatedAt: null,
};

async function advanceOnce(overrides = {}) {
    claimResearchJob.mockResolvedValueOnce({ ...job, ...overrides });
    const { db } = await import("@/server/db/drizzle");
    (db.query.artists.findFirst as jest.Mock).mockResolvedValue({ name: "Test Artist", instagram: "artist" });
    const { advanceResearch } = await import("@/server/utils/researchRunner");
    return advanceResearch({ budgetMs: 60_000 });
}

describe("an extraction job that has read everything", () => {
    beforeEach(() => {
        jest.resetModules();
        for (const m of [refreshArtistDoc, completeResearchJob, failResearchJob, saveJobProgress, saveJobState, failJobAtCursor, claimResearchJob]) m.mockReset();
        completeResearchJob.mockResolvedValue(undefined);
        failResearchJob.mockResolvedValue(undefined);
        saveJobProgress.mockResolvedValue(undefined);
    });

    it("completes when there is no document to rebuild", async () => {
        // The credits are stored. That was the job.
        refreshArtistDoc.mockResolvedValue("no-document");
        const result = await advanceOnce();

        expect(completeResearchJob).toHaveBeenCalledWith("job-1");
        expect(failResearchJob).not.toHaveBeenCalled();
        expect(result.done).toBe(true);
        // And it says which case it was, so "complete" is not silently ambiguous
        // between "rebuilt the document" and "there was none".
        expect(result.progress).toContain("no document to rebuild");
    });

    it('passes the Lore job identity to the ownership fence and stops cancelled work', async () => {
        claimResearchJob.mockResolvedValueOnce({ ...job, kind: 'lore_refresh', state: { claimId: 'claim-1' } });
        refreshArtistDoc.mockResolvedValue('cancelled');
        const { db } = await import('@/server/db/drizzle');
        db.execute.mockResolvedValue([]);
        const { advanceResearch } = await import('@/server/utils/researchRunner');
        const result = await advanceResearch({ budgetMs: 60_000 });
        expect(refreshArtistDoc).toHaveBeenCalledWith('artist-1', { createIfMissing: true, jobId: 'job-1', expectedClaimId: 'claim-1' });
        expect(failResearchJob).not.toHaveBeenCalled();
        expect(result.done).toBe(true);
        expect(result.progress).toContain('cancelled');
    });

    it("completes when the document was rebuilt", async () => {
        refreshArtistDoc.mockResolvedValue("rebuilt");
        const result = await advanceOnce();

        expect(completeResearchJob).toHaveBeenCalledWith("job-1");
        expect(failResearchJob).not.toHaveBeenCalled();
        expect(result.progress).not.toContain("no document");
    });

    it('threads job identity through collection and follow-up enqueue', async () => {
        claimResearchJob.mockResolvedValueOnce({ ...job, kind: 'social_ingest', state: { apifyRunId: 'run-1' } });
        const ingest = await import('@/server/utils/socialIngest');
        ingest.checkInstagramScrape.mockResolvedValue({ status: 'succeeded', datasetId: 'dataset-1' });
        ingest.collectInstagramScrape.mockResolvedValue({ ingested: 1 });
        const { advanceResearch } = await import('@/server/utils/researchRunner');
        await advanceResearch({ budgetMs: 60_000 });
        expect(ingest.collectInstagramScrape).toHaveBeenCalledWith('artist-1', 'artist', 'dataset-1', 'job-1', 0);
        const { enqueueResearchJob } = await import('@/server/utils/queries/researchJobQueries');
        expect(enqueueResearchJob).toHaveBeenCalledWith('artist-1', 'caption_extract', expect.objectContaining({ parentJobId: 'job-1' }));
    });

    it('resumes thumbnail collection before completing or starting extraction', async () => {
        claimResearchJob.mockResolvedValueOnce({ ...job, kind: 'social_ingest', cursor: 9, state: { apifyRunId: 'run-1' } });
        const ingest = await import('@/server/utils/socialIngest');
        ingest.checkInstagramScrape.mockResolvedValue({ status: 'succeeded', datasetId: 'dataset-1' });
        ingest.collectInstagramScrape.mockResolvedValue({ ingested: 9, nextCursor: 18 });
        const { advanceResearch } = await import('@/server/utils/researchRunner');
        const result = await advanceResearch({ budgetMs: 60_000 });
        expect(ingest.collectInstagramScrape).toHaveBeenCalledWith('artist-1', 'artist', 'dataset-1', 'job-1', 9);
        expect(saveJobProgress).toHaveBeenCalledWith('job-1', 18, { state: { apifyRunId: 'run-1' } });
        expect(completeResearchJob).not.toHaveBeenCalled();
        const { enqueueResearchJob } = await import('@/server/utils/queries/researchJobQueries');
        expect(enqueueResearchJob).not.toHaveBeenCalled();
        expect(result.done).toBe(false);
    });

    it('waits for enough invocation time before downloading thumbnails', async () => {
        claimResearchJob.mockResolvedValueOnce({ ...job, kind: 'social_ingest', cursor: 9, state: { apifyRunId: 'run-1' } });
        const ingest = await import('@/server/utils/socialIngest');
        ingest.checkInstagramScrape.mockResolvedValue({ status: 'succeeded', datasetId: 'dataset-1' });
        const { advanceResearch } = await import('@/server/utils/researchRunner');
        const result = await advanceResearch({ budgetMs: 15_000 });
        expect(ingest.collectInstagramScrape).not.toHaveBeenCalled();
        expect(saveJobProgress).toHaveBeenCalledWith('job-1', 9, { state: { apifyRunId: 'run-1' } });
        expect(result.waiting).toBe(true);
        expect(result.done).toBe(false);
    });

    it('threads job identity through credit clearing and appending', async () => {
        refreshArtistDoc.mockResolvedValue('rebuilt');
        await advanceOnce({ state: { fullRebuild: true, swept: true } });
        const { clearSocialCredits, appendSocialCredits } = await import('@/server/utils/queries/socialCreditQueries');
        expect(clearSocialCredits).toHaveBeenCalledWith('artist-1', 'job-1');
        expect(appendSocialCredits).toHaveBeenCalledWith('artist-1', expect.any(Object), expect.any(Map), 'job-1');
    });

    it('does not retry or spawn follow-up jobs after a cancelled collection', async () => {
        claimResearchJob.mockResolvedValueOnce({ ...job, kind: 'social_ingest', state: { apifyRunId: 'run-1' } });
        const ingest = await import('@/server/utils/socialIngest');
        const { OwnershipChangedError } = await import('@/server/utils/queries/ownershipWrites');
        ingest.checkInstagramScrape.mockResolvedValue({ status: 'succeeded', datasetId: 'dataset-1' });
        ingest.collectInstagramScrape.mockRejectedValue(new OwnershipChangedError());
        const { advanceResearch } = await import('@/server/utils/researchRunner');
        const result = await advanceResearch({ budgetMs: 60_000 });
        expect(result.progress).toContain('cancelled');
        expect(failResearchJob).not.toHaveBeenCalled();
        const { enqueueResearchJob } = await import('@/server/utils/queries/researchJobQueries');
        expect(enqueueResearchJob).not.toHaveBeenCalled();
    });

    it("still fails, and retries, when the rebuild genuinely breaks", async () => {
        // The other half of the same distinction: a rebuild that throws must
        // not be quietly completed, or the document and the export stay stale
        // forever with no live job to fix them.
        refreshArtistDoc.mockResolvedValue("failed");
        const result = await advanceOnce();

        expect(failResearchJob).toHaveBeenCalledWith("job-1", expect.stringContaining("document rebuild failed"));
        expect(completeResearchJob).not.toHaveBeenCalled();
        expect(result.done).toBe(false);
    });
});
