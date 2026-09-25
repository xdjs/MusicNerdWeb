import { eq } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';
import { artistVaultSources } from '@/server/db/schema';

/** Compare source identities without loading the stored article bodies. */
export async function getVaultSourceUrlsByArtistId(artistId: string): Promise<string[]> {
    const rows = await db.query.artistVaultSources.findMany({
        columns: { url: true },
        where: eq(artistVaultSources.artistId, artistId),
    });
    return rows.map(row => row.url).filter((url): url is string => !!url);
}
