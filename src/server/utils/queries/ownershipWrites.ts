import { db } from '@/server/db/drizzle';
import { artistClaims, artistResearchJobs, users } from '@/server/db/schema';
import { and, eq, sql } from 'drizzle-orm';

export type WriteDb = Pick<typeof db, 'insert' | 'delete' | 'execute'>;
export class OwnershipChangedError extends Error {
    constructor() { super('Artist ownership changed; this operation was cancelled.'); }
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
        const claim = await tx.query.artistClaims.findFirst({
            where: and(eq(artistClaims.artistId, artistId), eq(artistClaims.status, 'approved')),
        });
        if ((claim?.id ?? null) !== expectedClaimId) throw new OwnershipChangedError();
        if (claim?.userId !== userId) {
            const user = await tx.query.users.findFirst({ where: eq(users.id, userId) });
            if (!user?.isAdmin) throw new OwnershipChangedError();
        }
        return write(tx);
    });
}
