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
