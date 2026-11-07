import { markAboutWriter } from '../bio/markAboutWriter';
import {recordBioSourceUrlReceipts} from '../bio/recordBioSourceUrlReceipts';
import {preserveRevokedBio} from '../bio/preserveRevokedBio';
import {writeBioProvenance} from '../bio/writeBioProvenance';
import { retainEditedBioProvenance } from '../bio/retainEditedBioProvenance';
import { saveBioHistory } from '../bio/saveBioHistory';
import { SUPABASE_URL } from '@/env';
import { classifyRevokedSource } from './classifyRevokedSource';
import { recordArtistActivity } from '../activity/recordArtistActivity';
import { db } from "@/server/db/drizzle";
import { eq, and, sql, inArray } from "drizzle-orm";
import { artistBioProvenance, artistBioVersionProvenance, artistActivityEvents, mcpAuditLog, artistClaims, artistVaultSources, artistBioVersions, artists, artistDocs, artistInterviewAnswers, artistOnboardingSteps, artistSocialPosts, artistSocialRefreshes, artistSocialProfiles, artistResearchJobs, artistSocialCredits, artistDocCorrections } from "@/server/db/schema";
import { withArtistUploadWrite, withScopedArtistWrite, authorizeLockedArtistWrite, type ArtistWriteAuth, type WriteDb, type ScopedWriteDb } from './ownershipWrites';
import { getActiveArtistOperation } from '../artistOperationContext';
import { isRealBio } from '@/lib/bio/bioConstants';
import { canonicalizeLoreUrl } from '@/lib/source/canonicalizeLoreUrl';

export { getClaimByArtistId } from './getClaimByArtistId';

export async function getClaimById(claimId: string) {
    try {
        return await db.query.artistClaims.findFirst({
            where: eq(artistClaims.id, claimId),
        });
    } catch (e) {
        console.error("[getClaimById] Error:", e);
        return undefined;
    }
}

export async function getApprovedClaimByUserId(userId: string) {
    try {
        return await db.query.artistClaims.findFirst({
            where: and(
                eq(artistClaims.userId, userId),
                eq(artistClaims.status, "approved"),
            ),
            with: { artist: true },
        });
    } catch (e) {
        console.error("[getApprovedClaimByUserId] Error:", e);
        return undefined;
    }
}

export async function createClaim(userId: string, artistId: string, referenceCode: string) {
    try {
        const [claim] = await db
            .insert(artistClaims)
            .values({
                userId,
                artistId,
                status: "pending",
                referenceCode,
            })
            .returning();
        return claim;
    } catch (e) {
        console.error("[createClaim] Error:", e);
        throw e;
    }
}

export async function getPendingClaims() {
    try {
        return await db.query.artistClaims.findMany({
            where: eq(artistClaims.status, "pending"),
            with: { user: true, artist: true },
            orderBy: (claims, { desc }) => [desc(claims.createdAt)],
        });
    } catch (e) {
        console.error("[getPendingClaims] Error:", e);
        return [];
    }
}

// TODO: Add cursor-based pagination when claims exceed ~500 rows
// Pending claims sort first so they're never crowded out by older approved/rejected ones
export async function getAllClaims() {
    const limit = 200;
    try {
        return await db.query.artistClaims.findMany({
            with: { user: true, artist: true },
            orderBy: (claims, { asc, desc }) => [
                asc(sql`CASE WHEN ${claims.status} = 'pending' THEN 0 WHEN ${claims.status} = 'approved' THEN 1 ELSE 2 END`),
                desc(claims.createdAt),
            ],
            limit,
        });
    } catch (e) {
        console.error("[getAllClaims] Error:", e);
        return [];
    }
}

export async function approveClaim(claimId: string) {
    try {
        const [updated] = await db
            .update(artistClaims)
            .set({
                status: "approved",
                updatedAt: sql`(now() AT TIME ZONE 'utc'::text)`,
            })
            .where(eq(artistClaims.id, claimId))
            .returning();
        return updated;
    } catch (e) {
        console.error("[approveClaim] Error:", e);
        throw e;
    }
}

export async function rejectClaim(claimId: string) {
    try {
        const [updated] = await db
            .update(artistClaims)
            .set({
                status: "rejected",
                updatedAt: sql`(now() AT TIME ZONE 'utc'::text)`,
            })
            .where(eq(artistClaims.id, claimId))
            .returning();
        return updated;
    } catch (e) {
        console.error("[rejectClaim] Error:", e);
        throw e;
    }
}

export async function deleteClaim(claimId: string) {
    try {
        const [deleted] = await db
            .delete(artistClaims)
            .where(eq(artistClaims.id, claimId))
            .returning();
        return deleted;
    } catch (e) {
        console.error("[deleteClaim] Error:", e);
        throw e;
    }
}

/** Revoke claimant content atomically; retain verified trusted submissions.
 * Unknown provenance blocks the transaction. Storage deletion requires separate
 * object-generation fencing and is deliberately deferred, never prefix-purged.
 */
export async function revokeApprovedClaim(claimId: string, adminId: string) {
    try {
        return await db.transaction(async (tx) => {
            const candidate = await tx.query.artistClaims.findFirst({ where: eq(artistClaims.id, claimId) });
            if (!candidate || candidate.status !== 'approved') return undefined;
            // Match upload/review lock order: artist before claim/source rows.
            await tx.execute(sql`select id from artists where id = ${candidate.artistId}::uuid for update`);
            const sources = await tx.select().from(artistVaultSources)
                .where(eq(artistVaultSources.artistId, candidate.artistId)).for('update');
            const events = await tx.select().from(artistActivityEvents)
                .where(eq(artistActivityEvents.artistId, candidate.artistId));
            const byId = new Map(events.map(event => [event.id, event]));
            const removable = sources.filter(source => {
                const disposition = classifyRevokedSource(source, byId.get(source.activityId ?? '') ?? null, candidate.userId);
                if (disposition === 'review') throw new Error('REVOCATION_SOURCE_REVIEW_REQUIRED');
                return disposition === 'delete';
            });
            // Atomic: only delete the row if it is still approved right now.
            // Returns 0 rows (→ undefined) if another transaction changed the status.
            const [deleted] = await tx
                .delete(artistClaims)
                .where(and(
                    eq(artistClaims.id, claimId),
                    eq(artistClaims.artistId, candidate.artistId),
                    eq(artistClaims.userId, candidate.userId),
                    eq(artistClaims.status, "approved"),
                ))
                .returning();
            if (!deleted) return undefined;

            // Only this configured storage origin owns managed profile uploads.
            // Capture the reference before clearing it; retain the object bytes.
            if (SUPABASE_URL) {
                const prefix = `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/vault-files/profile-images/${deleted.artistId}_`;
                const managed = sql`id = ${deleted.artistId}::uuid and starts_with(custom_image, ${prefix})`;
                await tx.execute(sql`insert into mcp_audit_log (artist_id,field,action,old_value,new_value,api_key_hash)
                    select id, 'claim_profile_cleanup_deferred', 'delete', custom_image,
                        'Object retained; generation verification required before cleanup', ${`admin:${adminId}`}
                    from artists where ${managed}`);
                await tx.execute(sql`update artists set custom_image = null where ${managed}`);
            }
            // Removing the job identity invalidates even an already-running model
            // call. Its final guarded write cannot recreate the deleted Lore.
            await tx.delete(artistResearchJobs).where(eq(artistResearchJobs.artistId, deleted.artistId));
            await tx.delete(artistSocialCredits).where(eq(artistSocialCredits.artistId, deleted.artistId));
            await tx.delete(artistDocCorrections).where(eq(artistDocCorrections.artistId, deleted.artistId));

            if (removable.length) {
                await tx.delete(artistVaultSources).where(and(
                    eq(artistVaultSources.artistId, deleted.artistId),
                    inArray(artistVaultSources.id, removable.map(source => source.id)),
                ));
            }
            // Durable receipt commits with revocation or neither does. These are
            // candidates for review, NOT authorization to delete mutable object keys.
            const retainedPaths = new Set(sources.filter(source => !removable.includes(source)).map(source => source.filePath));
            await tx.insert(mcpAuditLog).values({
                artistId: deleted.artistId, field: 'claim_cleanup_deferred', action: 'delete',
                apiKeyHash: `admin:${adminId}`,
                oldValue: JSON.stringify({ claimId, sources: removable.map(source => ({
                    id: source.id, filePath: retainedPaths.has(source.filePath) ? null : source.filePath,
                })) }),
                newValue: 'Storage cleanup deferred: object generation cannot be verified; no prefix deletion authorized.',
            });

            // Scraped social data (posts + profile) is the revoked owner's too — a
            // re-claimer must not inherit the previous owner's Instagram history or
            // the grounded questions derived from it. Same tx, same invariant.
            await tx
                .delete(artistSocialPosts)
                .where(eq(artistSocialPosts.artistId, deleted.artistId));
            // Coverage cannot survive deletion of the posts it describes. Clear
            // every account and scope while holding the same revocation lock.
            await tx
                .delete(artistSocialRefreshes)
                .where(eq(artistSocialRefreshes.artistId, deleted.artistId));
            await tx
                .delete(artistSocialProfiles)
                .where(eq(artistSocialProfiles.artistId, deleted.artistId));

            // Onboarding content is the revoked owner's — it must not survive for
            // (or silently skip onboarding of) the next claimant. Same tx as the
            // vault wipe, same invariant (see spec §5).
            await tx
                .delete(artistInterviewAnswers)
                .where(eq(artistInterviewAnswers.artistId, deleted.artistId));
            await tx
                .delete(artistOnboardingSteps)
                .where(eq(artistOnboardingSteps.artistId, deleted.artistId));
            const deletedDocs = await tx
                .delete(artistDocs)
                .where(eq(artistDocs.artistId, deleted.artistId))
                .returning();
            // Admin revocation is the explicit moderation exception to pinning.
            // Keep saved history, but never leave the next claimant a locked bio.
            const unpinned = await tx.update(artistBioVersions)
                .set({ isPinned: false })
                .where(and(eq(artistBioVersions.artistId, deleted.artistId), eq(artistBioVersions.isPinned, true)))
                .returning();
            if (deletedDocs.length > 0 || unpinned.length > 0) {
                // Preserve even a hand-edited bio that never reached version history.
                await preserveRevokedBio(tx,deleted.artistId);
                await writeBioProvenance(tx,deleted.artistId,null);
                await markAboutWriter(tx);
                await tx
                    .update(artists)
                    .set({ bio: null })
                    .where(eq(artists.id, deleted.artistId));
            }

            return deleted;
        });
    } catch (e) {
        console.error("[revokeApprovedClaim] Error:", e);
        throw e;
    }
}

export async function getApprovedClaimForArtistByUserId(userId: string, artistId: string) {
    try {
        return await db.query.artistClaims.findFirst({
            where: and(
                eq(artistClaims.userId, userId),
                eq(artistClaims.artistId, artistId),
                eq(artistClaims.status, "approved"),
            ),
        });
    } catch (e) {
        console.error("[getApprovedClaimForArtistByUserId] Error:", e);
        return undefined;
    }
}

export async function getPendingClaimByUserId(userId: string) {
    try {
        return await db.query.artistClaims.findFirst({
            where: and(
                eq(artistClaims.userId, userId),
                eq(artistClaims.status, "pending"),
            ),
            with: { artist: true },
        });
    } catch (e) {
        console.error("[getPendingClaimByUserId] Error:", e);
        return undefined;
    }
}

export async function getVaultSourcesByArtistId(artistId: string, status?: string) {
    try {
        if (status) {
            return await db.query.artistVaultSources.findMany({
                where: and(
                    eq(artistVaultSources.artistId, artistId),
                    eq(artistVaultSources.status, status as "pending" | "approved" | "rejected"),
                ),
                orderBy: (sources, { desc }) => [desc(sources.createdAt)],
            });
        }
        return await db.query.artistVaultSources.findMany({
            where: eq(artistVaultSources.artistId, artistId),
            orderBy: (sources, { desc }) => [desc(sources.createdAt)],
        });
    } catch (e) {
        console.error("[getVaultSourcesByArtistId] Error:", e);
        return [];
    }
}

export async function getVaultSourceByIdAndArtist(sourceId: string, artistId: string) {
    try {
        return await db.query.artistVaultSources.findFirst({
            where: and(
                eq(artistVaultSources.id, sourceId),
                eq(artistVaultSources.artistId, artistId),
            ),
        });
    } catch (e) {
        console.error("[getVaultSourceByIdAndArtist] Error:", e);
        return undefined;
    }
}

export async function getVaultSourceById(sourceId: string) {
    try {
        return await db.query.artistVaultSources.findFirst({
            where: (s, { eq }) => eq(s.id, sourceId),
        });
    } catch (e) {
        console.error("[getVaultSourceById] Error:", e);
        return undefined;
    }
}

async function withVaultSourceWrite<T>(sourceId: string, write: (tx: ScopedWriteDb, predicate: ReturnType<typeof eq>) => Promise<T>): Promise<T> {
    const scope = getActiveArtistOperation();
    if (!scope) return write(db, eq(artistVaultSources.id, sourceId));
    return withScopedArtistWrite(scope.artistId, tx => write(tx, and(eq(artistVaultSources.id, sourceId), eq(artistVaultSources.artistId, scope.artistId))!));
}

export { updateVaultSourceStatus } from './updateVaultSourceStatus';

export { insertVaultSource } from './insertVaultSource';

export async function deleteVaultSource(sourceId: string) {
    try {
        const [deleted] = await withVaultSourceWrite(sourceId, async (tx, predicate) => tx
            .delete(artistVaultSources)
            .where(predicate)
            .returning());
        return deleted;
    } catch (e) {
        console.error("[deleteVaultSource] Error:", e);
        throw e;
    }
}

export async function updateVaultSourceType(sourceId: string, type: string) {
    try {
        const [updated] = await withVaultSourceWrite(sourceId, async (tx, predicate) => tx
            .update(artistVaultSources)
            .set({
                type,
                updatedAt: sql`(now() AT TIME ZONE 'utc'::text)`,
            })
            .where(predicate)
            .returning());
        return updated;
    } catch (e) {
        console.error("[updateVaultSourceType] Error:", e);
        throw e;
    }
}

export async function deleteVaultSources(sourceIds: string[]) {
    if (sourceIds.length === 0) return [];
    try {
        const { inArray } = await import("drizzle-orm");
        const deleted = await db
            .delete(artistVaultSources)
            .where(inArray(artistVaultSources.id, sourceIds))
            .returning();
        return deleted;
    } catch (e) {
        console.error("[deleteVaultSources] Error:", e);
        throw e;
    }
}

export async function updateVaultSourceContent(sourceId: string, data: {
    title?: string;
    snippet?: string;
    extractedText?: string | null;
    ogImage?: string;
    podcastEpisodeKey?: string | null;
    podcastShowTitle?: string | null;
    podcastEpisodeTitle?: string | null;
    publishedAt?: string | null;
}) {
    try {
        const [updated] = await withVaultSourceWrite(sourceId, async (tx, predicate) => tx
            .update(artistVaultSources)
            .set({
                ...(data.title !== undefined ? { title: data.title } : {}),
                ...(data.snippet !== undefined ? { snippet: data.snippet } : {}),
                ...(data.extractedText !== undefined ? { extractedText: data.extractedText } : {}),
                ...(data.ogImage !== undefined ? { ogImage: data.ogImage } : {}),
                ...(data.podcastEpisodeKey !== undefined ? { podcastEpisodeKey: data.podcastEpisodeKey } : {}),
                ...(data.podcastShowTitle !== undefined ? { podcastShowTitle: data.podcastShowTitle } : {}),
                ...(data.podcastEpisodeTitle !== undefined ? { podcastEpisodeTitle: data.podcastEpisodeTitle } : {}),
                ...(data.publishedAt !== undefined ? { publishedAt: data.publishedAt } : {}),
                updatedAt: sql`(now() AT TIME ZONE 'utc'::text)`,
            })
            .where(predicate)
            .returning());
        return updated;
    } catch (e) {
        console.error("[updateVaultSourceContent] Error:", e);
        throw e;
    }
}

// ------ Bio Versions ------

export async function getBioVersionsByArtistId(artistId: string) {
    try {
        return await db.query.artistBioVersions.findMany({
            where: eq(artistBioVersions.artistId, artistId),
            orderBy: (versions, { desc }) => [desc(versions.createdAt)],
        });
    } catch (e) {
        console.error("[getBioVersionsByArtistId] Error:", e);
        return [];
    }
}

const MAX_BIO_VERSIONS = 50;

export async function saveBioVersion(artistId: string, bioText: string, auth: ArtistWriteAuth) {
    try {
        if (!isRealBio(bioText)) throw new Error('Write a bio before saving a version.');
        // All operations in a single transaction to prevent TOCTOU race on version cap
        return await db.transaction(async (tx) => {
            await tx.execute(sql`select id from artists where id = ${artistId}::uuid for update`);
            await authorizeLockedArtistWrite(tx, artistId, auth);
            // Never discard an artist's saved history automatically.
            const existing = await tx.query.artistBioVersions.findMany({
                where: eq(artistBioVersions.artistId, artistId),
                orderBy: (v, { asc }) => [asc(v.createdAt)],
            });
            const current = await tx.query.artists.findFirst({ where: eq(artists.id, artistId) });
            const currentProvenance = (await tx.query.artistBioProvenance.findFirst({where:eq(artistBioProvenance.artistId,artistId)}))?.provenance ?? null;
            const historyProvenance = existing.length ? await tx.query.artistBioVersionProvenance.findMany({where:inArray(artistBioVersionProvenance.versionId,existing.map(v=>v.id))}) : [];
            const provenanceOf = (id:string) => historyProvenance.find(p=>p.versionId===id)?.provenance ?? null;
            const matching = existing.filter(version => version.bioText === bioText);
            // A save of known historical text must not relabel it as new manual prose.
            const bioProvenance = current?.bio === bioText ? currentProvenance
                : matching.map(version => provenanceOf(version.id)).find(p=>p!=null)
                    ?? retainEditedBioProvenance(current?.bio ?? null, bioText, currentProvenance);
            await recordBioSourceUrlReceipts(tx, bioProvenance);
            const saved = matching.find(version => JSON.stringify(provenanceOf(version.id)) === JSON.stringify(bioProvenance));
            if (saved) return saved;
            if (existing.length >= MAX_BIO_VERSIONS) {
                throw new Error("Bio version limit reached — delete an unwanted version first");
            }

            const [version] = await tx
                .insert(artistBioVersions)
                .values({ artistId, bioText, isPinned: false })
                .returning();
            if (version && bioProvenance != null) await tx.insert(artistBioVersionProvenance).values({versionId:version.id,provenance:bioProvenance});
            return version;
        });
    } catch (e) {
        console.error("[saveBioVersion] Error:", e);
        throw e;
    }
}

export async function pinBioVersion(versionId: string, artistId: string, auth: ArtistWriteAuth) {
    try {
        // Atomic: unpin all → pin selected → update artist bio
        // Reauthorize under the same lock; artistId matching alone is not ownership.
        return await db.transaction(async (tx) => {
            await tx.execute(sql`select id from artists where id = ${artistId}::uuid for update`);
            await authorizeLockedArtistWrite(tx, artistId, auth);
            const selected = await tx.query.artistBioVersions.findFirst({
                where: and(eq(artistBioVersions.id, versionId), eq(artistBioVersions.artistId, artistId)),
            });
            if (!selected) return undefined;
            const current = await tx.query.artists.findFirst({ where: eq(artists.id, artistId) });
            const currentProvenance = (await tx.query.artistBioProvenance.findFirst({where:eq(artistBioProvenance.artistId,artistId)}))?.provenance ?? null;
            const selectedProvenance = (await tx.query.artistBioVersionProvenance.findFirst({where:eq(artistBioVersionProvenance.versionId,selected.id)}))?.provenance ?? null;
            if (current?.bio) await saveBioHistory(tx, artistId, [{ text: current.bio, provenance: currentProvenance }]);
            await tx
                .update(artistBioVersions)
                .set({ isPinned: false })
                .where(eq(artistBioVersions.artistId, artistId));

            const [pinned] = await tx
                .update(artistBioVersions)
                .set({ isPinned: true })
                .where(and(eq(artistBioVersions.id, versionId), eq(artistBioVersions.artistId, artistId)))
                .returning();

            if (pinned) {
                await writeBioProvenance(tx,artistId,selectedProvenance);
                await markAboutWriter(tx);
                await tx
                    .update(artists)
                    .set({ bio: pinned.bioText })
                    .where(eq(artists.id, artistId));
            }

            return pinned;
        });
    } catch (e) {
        console.error("[pinBioVersion] Error:", e);
        throw e;
    }
}

export async function deleteBioVersion(versionId: string, artistId: string, auth: ArtistWriteAuth) {
    try {
        // Atomic check + delete to prevent TOCTOU race with concurrent pin
        return await db.transaction(async (tx) => {
            await tx.execute(sql`select id from artists where id = ${artistId}::uuid for update`);
            await authorizeLockedArtistWrite(tx, artistId, auth);
            const version = await tx.query.artistBioVersions.findFirst({
                where: and(eq(artistBioVersions.id, versionId), eq(artistBioVersions.artistId, artistId)),
            });
            if (!version) return undefined;
            if (version.isPinned) throw new Error("Cannot delete a pinned bio version");

            const [deleted] = await tx
                .delete(artistBioVersions)
                .where(and(eq(artistBioVersions.id, versionId), eq(artistBioVersions.artistId, artistId)))
                .returning();
            return deleted;
        });
    } catch (e) {
        console.error("[deleteBioVersion] Error:", e);
        throw e;
    }
}

export async function unpinArtistBio(artistId: string, auth: ArtistWriteAuth) {
    await db.transaction(async tx => {
        await tx.execute(sql`select id from artists where id = ${artistId}::uuid for update`);
        await authorizeLockedArtistWrite(tx, artistId, auth);
        await tx.update(artistBioVersions).set({ isPinned: false })
            .where(eq(artistBioVersions.artistId, artistId));
    });
}
