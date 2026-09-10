import { db } from '@/server/db/drizzle';
import { artistClaims, artistResearchJobs, users } from '@/server/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { getArtistOperationOwnership } from '../artistOperationContext';

export type WriteDb = Pick<typeof db, 'insert' | 'delete' | 'execute'>;
type TransactionDb = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type ArtistWriteAuth = { userId: string; expectedClaimId: string | null };
export type ScopedWriteDb = Pick<typeof db, 'query' | 'select' | 'insert' | 'update' | 'delete' | 'execute'>;
export class OwnershipChangedError extends Error {
    constructor() { super('Artist ownership changed; this operation was cancelled.'); }
}

/** Call only after taking the artist row lock, in the mutation's transaction. */
export async function authorizeLockedArtistWrite(tx: TransactionDb, artistId: string, auth: ArtistWriteAuth) {
    const claim = await tx.query.artistClaims.findFirst({
        where: and(eq(artistClaims.artistId, artistId), eq(artistClaims.status, 'approved')),
    });
    if ((claim?.id ?? null) !== auth.expectedClaimId) throw new OwnershipChangedError();
    if (claim?.userId !== auth.userId) {
        const user = await tx.query.users.findFirst({ where: eq(users.id, auth.userId) });
        if (!user?.isAdmin) throw new OwnershipChangedError();
    }
}

/** For existing transactions: keep their advisory-lock order, then lock the artist. */
export async function lockScopedArtistWrite(tx: TransactionDb, artistId: string) {
    const context = getArtistOperationOwnership(artistId);
    if (!context) return;
    await tx.execute(sql`select id from artists where id = ${artistId}::uuid for update`);
    if (context.userId) {
        await authorizeLockedArtistWrite(tx, artistId, { userId: context.userId, expectedClaimId: context.expectedClaimId });
    } else {
        const claim = await tx.query.artistClaims.findFirst({ where: and(eq(artistClaims.artistId, artistId), eq(artistClaims.status, 'approved')) });
        if ((claim?.id ?? null) !== context.expectedClaimId) throw new OwnershipChangedError();
    }
}

/** Scoped long-running operations reauthorize each short write, not the network work. */
export async function withScopedArtistWrite<T>(artistId: string, write: (tx: ScopedWriteDb) => Promise<T>): Promise<T> {
    if (!getArtistOperationOwnership(artistId)) return write(db);
    return db.transaction(async tx => {
        await lockScopedArtistWrite(tx, artistId);
        return write(tx);
    });
}

/** Only the short database write is locked, never extraction or remote I/O. */
export async function withResearchJobWrite<T>(artistId: string, jobId: string, write: (tx: WriteDb) => Promise<T>): Promise<T> {
    return db.transaction(async tx => {
        await tx.execute(sql`select id from artists where id = ${artistId}::uuid for update`);
        const job = await tx.query.artistResearchJobs.findFirst({
            where: and(eq(artistResearchJobs.id, jobId), eq(artistResearchJobs.artistId, artistId)),
        });
        if (!job) throw new OwnershipChangedError();
        return write(tx);
    });
}

export async function withArtistUploadWrite<T>(artistId: string, userId: string, expectedClaimId: string | null,
    write: (tx: WriteDb) => Promise<T>): Promise<T> {
    return db.transaction(async tx => {
        await tx.execute(sql`select id from artists where id = ${artistId}::uuid for update`);
        await authorizeLockedArtistWrite(tx, artistId, { userId, expectedClaimId });
        return write(tx);
    });
}
