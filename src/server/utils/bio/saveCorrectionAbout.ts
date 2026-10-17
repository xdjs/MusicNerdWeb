import { sql } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';
import { isRealBio, MAX_BIO_LENGTH } from '@/lib/bio/bioConstants';
import { CorrectionAboutConflict } from '@/lib/bio/correctionAboutTypes';
import { recordArtistActivity } from '@/server/utils/activity/recordArtistActivity';
import { getCorrectionAbout } from './getCorrectionAbout';

/** The About, history, audit and report resolution are a single admin transaction. */
export async function saveCorrectionAbout(reportId: string, userId: string, bio: string, revision: string) {
  if (!isRealBio(bio) || bio.length > MAX_BIO_LENGTH) throw new CorrectionAboutConflict('Enter an About of up to 10,000 characters.');
  return db.transaction(async tx => {
    const [admin] = await tx.execute(sql`select id from users where id=${userId}::uuid and is_admin=true`);
    if (!admin) throw new CorrectionAboutConflict('Administrator access is required.');
    // Same artist-first lock order as bio, pin, claim and research writers.
    const [artist] = await tx.execute<{id: string}>(sql`select a.id from artists a
      join artist_bio_corrections r on r.artist_id=a.id where r.id=${reportId}::uuid for update of a`);
    if (!artist) throw new CorrectionAboutConflict('This report no longer exists.');
    await tx.execute(sql`select id from artist_bio_corrections where id=${reportId}::uuid for update`);
    await tx.execute(sql`select artist_id from artist_directory_preparations where artist_id=${artist.id}::uuid for update`);
    const current = await getCorrectionAbout(reportId, tx);
    if (current.revision !== revision) throw new CorrectionAboutConflict('The About or artist ownership changed. Your draft is kept; cancel and reopen the editor to review the latest version.');
    for (const text of new Set([current.bio, bio])) {
      await tx.execute(sql`insert into artist_bio_versions(artist_id,bio_text,is_pinned)
        select ${artist.id}::uuid,${text},false where not exists
        (select 1 from artist_bio_versions where artist_id=${artist.id}::uuid and bio_text=${text})`);
    }
    if (current.claimed) {
      await tx.execute(sql`update artists set bio=${bio} where id=${artist.id}::uuid`);
    } else {
      // Keep identity/source gates and the private pre-claim preparation untouched.
      await tx.execute(sql`update artist_directory_preparations
        set public_about=public_about || jsonb_build_object('bio',${bio}::text,'kind','researched'), updated_at=now()
        where artist_id=${artist.id}::uuid`);
    }
    await recordArtistActivity(artist.id, 'about_edited', { userId, trigger: 'about_correction' }, tx);
    await tx.execute(sql`update artist_bio_corrections set status='resolved',reviewed_at=now(),reviewed_by=${userId}::uuid where id=${reportId}::uuid`);
  });
}
