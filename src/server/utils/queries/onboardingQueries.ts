import { db } from "@/server/db/drizzle";
import { eq, sql } from "drizzle-orm";
import { artistDocs, artistInterviewAnswers, artistOnboardingSteps } from "@/server/db/schema";
import { withScopedArtistWrite } from './ownershipWrites';

/** The onboarding steps, in the chat's forced order. Reading their state is
 *  MusicNerdAPI's job now (GET /api/onboarding/{artistId}/state). */
export const ONBOARDING_STEPS = ["profiles", "vault", "interview", "publish"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Written ONLY by an explicit artist action in the chat. Idempotent (two-tab safe). */
export async function confirmOnboardingStep(artistId: string, step: OnboardingStep): Promise<void> {
    await withScopedArtistWrite(artistId, async tx => { await tx
        .insert(artistOnboardingSteps)
        .values({ artistId, step })
        .onConflictDoNothing({ target: [artistOnboardingSteps.artistId, artistOnboardingSteps.step] }); });
}

export { upsertInterviewAnswer } from "./upsertInterviewAnswer";

/**
 * Write down a batch of questions PUT to somebody, and never anything more.
 *
 * Insert-only, deliberately. The upsert version read the existing rows and then
 * wrote nulls, so an artist who answered the first question in the moment
 * between those two steps had their answer overwritten with `answer: null` —
 * losing what they had just typed, on the one screen in the product where the
 * words are theirs.
 *
 * `onConflictDoNothing` removes the race rather than narrowing it: a row that
 * exists, for any reason, in any order, is left exactly as it is.
 */
export async function recordInterviewBatchOffered(
    artistId: string,
    questions: Array<{
        questionKey: string;
        question: string;
    }>,
): Promise<void> {
    if (questions.length === 0) return;

    // WHICH SITTING THIS BELONGS TO, decided here because this is the only
    // place questions are put to an artist. Computing it once for the batch is
    // what guarantees every question visible in one panel shares a boundary.
    //
    // An open row means a sitting is already in front of them, and anything
    // offered now is part of it — that is what a top-up is, when a resumed
    // sitting has fewer questions left than a full one. Otherwise this starts a
    // new sitting.
    //
    // NOT DERIVED FROM TIMESTAMPS. Five attempts did that and each had a hole.
    // `created_at` moves when the answer arrives, while `offered_at` moves when
    // a top-up is added; neither clock can say that differently timed rows were
    // visible together. A topped-up row needs the stored membership instead.
    let sitting = 1;
    try {
        const rows = await db.select({ sitting: artistInterviewAnswers.sitting, source: artistInterviewAnswers.source })
            .from(artistInterviewAnswers)
            .where(eq(artistInterviewAnswers.artistId, artistId));
        const open = rows.find(r => r.source === "offered");
        if (open) {
            // Join the sitting in progress. Null is a pre-0022 row, which is
            // always sitting 1.
            sitting = open.sitting ?? 1;
        } else if (rows.length > 0) {
            sitting = Math.max(...rows.map(r => r.sitting ?? 1)) + 1;
        }
    } catch (e) {
        // Falling back to 1 makes a returning artist look new, which offers
        // them a generic question they may not want — annoying, and better
        // than throwing away the offer entirely.
        console.error("[recordInterviewBatchOffered] Could not read sitting:", e);
    }

    await withScopedArtistWrite(artistId, async tx => { await tx
        .insert(artistInterviewAnswers)
        .values(questions.map(question => ({
            artistId,
            ...question,
            answer: null,
            source: "offered" as const,
            sitting,
        })))
        .onConflictDoNothing({
            target: [artistInterviewAnswers.artistId, artistInterviewAnswers.questionKey],
        }); });
}

/**
 * `null` means WE DO NOT KNOW, which is not the same as "they have answered
 * nothing".
 *
 * Returning [] on a failure told the interview that a database blip was a
 * blank slate — so it would offer a first sitting to somebody who had already
 * done one, and re-ask every question they had answered. Callers that only
 * want to READ answers can treat null as empty; the one that decides whether to
 * ask has to stop.
 */
export async function getInterviewAnswers(artistId: string) {
    try {
        return await db.query.artistInterviewAnswers.findMany({
            where: eq(artistInterviewAnswers.artistId, artistId),
            orderBy: (a, { asc }) => [asc(a.createdAt)],
        });
    } catch (e) {
        console.error("[getInterviewAnswers] Error:", e);
        return null;
    }
}

export async function upsertArtistDoc(artistId: string, content: string): Promise<void> {
    await withScopedArtistWrite(artistId, async tx => { await tx
        .insert(artistDocs)
        .values({ artistId, content })
        .onConflictDoUpdate({
            target: [artistDocs.artistId],
            set: { content, updatedAt: sql`(now() AT TIME ZONE 'utc'::text)` },
        }); });
}

/** Separate call from `upsertArtistDoc` on purpose — that function's 2-arg
 *  (artistId, content) call site is load-bearing for existing tests, so the
 *  citation manifest is persisted as its own UPDATE instead of a third arg.
 *  Always called immediately after `upsertArtistDoc` in the same publish
 *  handler, so the row is guaranteed to already exist. */
export async function upsertArtistDocSources(artistId: string, sources: unknown[]): Promise<void> {
    await withScopedArtistWrite(artistId, async tx => { await tx
        .update(artistDocs)
        .set({ sources, updatedAt: sql`(now() AT TIME ZONE 'utc'::text)` })
        .where(eq(artistDocs.artistId, artistId)); });
}

/**
 * The same read as `getArtistDoc`, but it LETS THE ERROR OUT.
 *
 * `getArtistDoc` catches and returns `undefined`, which a caller cannot tell
 * apart from "this artist has no document". That is right for a page that
 * degrades to hiding a section, and wrong for anything that must answer
 * differently: the public /artist/<id>/llms.txt returns 404 for no document, a
 * status a crawler is entitled to cache and stop asking about. A database blip
 * answering 404 would quietly tell every model that an artist we know plenty
 * about has nothing.
 */
export async function getArtistDocStrict(artistId: string) {
    return await db.query.artistDocs.findFirst({
        where: eq(artistDocs.artistId, artistId),
    });
}

export async function getArtistDoc(artistId: string) {
    try {
        return await db.query.artistDocs.findFirst({
            where: eq(artistDocs.artistId, artistId),
        });
    } catch (e) {
        console.error("[getArtistDoc] Error:", e);
        return undefined;
    }
}
