import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';
import { isRealBio } from '@/lib/bio/bioConstants';
import { CorrectionAboutConflict } from '@/lib/bio/correctionAboutTypes';
import { getPublicArtistAbout } from './getPublicArtistAbout';

/** Admin-only context; callers authorize before reading. Raw preparation never leaves the server. */
export async function getCorrectionAbout(reportId: string, reader: Pick<typeof db, 'execute'> = db) {
  const [row] = await reader.execute<{
    artist_id: string; bio: string | null; claim_id: string | null;
    public_about: unknown; pinned: boolean; status: string;
  }>(sql`select r.artist_id, a.bio, r.status, p.public_about,
    (select c.id from artist_claims c where c.artist_id=a.id and c.status='approved' limit 1) claim_id,
    exists(select 1 from artist_bio_versions v where v.artist_id=a.id and v.is_pinned) pinned
    from artist_bio_corrections r join artists a on a.id=r.artist_id
    left join artist_directory_preparations p on p.artist_id=a.id where r.id=${reportId}::uuid`);
  if (!row || row.status !== 'pending') throw new CorrectionAboutConflict('This report has already been reviewed or no longer exists.');
  if (row.pinned) throw new CorrectionAboutConflict('This About is pinned. Unpin it on the artist profile before editing.');
  const about = row.claim_id ? null : await getPublicArtistAbout(row.artist_id, reader);
  const bio = row.claim_id ? row.bio : about?.bio;
  if (!bio || !isRealBio(bio)) throw new CorrectionAboutConflict('The published About is no longer available. Review the artist profile before resolving this report.');
  const revision = createHash('sha256').update(JSON.stringify([row.artist_id, row.claim_id, row.bio, row.public_about, bio])).digest('hex');
  return { bio, revision, artistId: row.artist_id, claimed: !!row.claim_id };
}
