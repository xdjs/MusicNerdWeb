import { approveSourceBackedUgc } from './approveSourceBackedUgc';
import { sql } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';
import { isDestinationSource } from '@/lib/musicLinks/isDestinationSource';
import { parseMusicDestination } from '@/lib/musicLinks/parseMusicDestination';
import type { LinkReviewDecision } from '@/lib/artistLinkReview/types';
import { recordArtistActivity } from '@/server/utils/activity/recordArtistActivity';
import { approveUGC } from '@/server/utils/queries/approveUGC';
import { acquireArtistPlatformWriteLocks } from '@/server/utils/artistIdentityLocks';
import { ArtistLinkConflictError } from '@/server/utils/artistLinks/ArtistLinkConflictError';
import { assertWritableLinkColumn } from '@/server/utils/artistLinks/assertWritableLinkColumn';
import { sanitizeColumnName } from '@/server/utils/artistLinks/sanitizeColumnName';
import { queueApprovedSourceExtraction } from '@/server/utils/source/queueApprovedSourceExtraction';
import { lockLinkReview } from './lockLinkReview';
/** Pending state, artist ownership, account conflicts and audit trail commit together. */
export async function reviewArtistLinkSuggestion(artistId: string, userId: string, input: LinkReviewDecision) {
  return db.transaction(async tx => {
    // Acquire the platform locks before the artist lock, matching direct link writers.
    if (input.kind === 'ugc') {
      const [hint] = await tx.execute(sql`select site_name,site_username from ugcresearch where id=${input.id}::uuid and artist_id=${artistId}::uuid`);
      if (hint && ['spotify','deezer'].includes(String(hint.site_name))) await acquireArtistPlatformWriteLocks(tx,artistId,String(hint.site_name),String(hint.site_username));
    }
    await lockLinkReview(tx,artistId,userId);
    const table = input.kind === 'ugc' ? 'ugcresearch' : 'artist_vault_sources';
    const [row] = await tx.execute(sql`select * from ${sql.identifier(table)} where id=${input.id}::uuid and artist_id=${artistId}::uuid for update`);
    if (!row) throw new ArtistLinkConflictError('This suggestion is no longer available. Refresh the profile.');
    const url = String(input.kind==='ugc'?row.ugc_url:row.url);
    const destination = parseMusicDestination(url);
    const sourceBacked = destination?.kind==='artist' && ['apple_music','beatport'].includes(destination.platform);
    if (destination?.kind==='release' || (input.kind==='source' && !isDestinationSource({url,type:row.type as string|null,podcastEpisodeKey:row.podcast_episode_key as string|null}))) throw new ArtistLinkConflictError('This is not an artist profile link. Review it in Lore.');
    if (input.decision==='remove') {
      if (input.kind!=='source' || row.status!=='approved') throw new ArtistLinkConflictError('Only an approved source link can be removed here.');
      await recordArtistActivity(artistId,'link_hidden',{userId,sourceId:input.id,trigger:'artist_link_review'},tx);
      return;
    }
    if (input.decision==='restore' && (input.kind!=='source' || row.status!=='approved')) throw new ArtistLinkConflictError('Only an approved source link can be restored.');
    const pending = input.kind==='ugc'?!row.accepted && !row.date_processed:row.status==='pending';
    const restoring = input.decision==='restore' && input.kind==='source' && row.status==='approved';
    if (!pending && !restoring) throw new ArtistLinkConflictError('This suggestion has already been reviewed. Refresh the profile.');
    const approved = input.decision==='approve' || restoring;
    if (approved) {
      const [artist] = await tx.execute(sql`select * from artists where id=${artistId}::uuid`);
      const platform = destination?.platform ?? String(row.site_name ?? '');
      if (input.kind==='ugc' && !sourceBacked) {
        const column = sanitizeColumnName(String(row.site_name));
        assertWritableLinkColumn(column);
        if (artist[column] && String(artist[column])!==String(row.site_username)) throw new ArtistLinkConflictError('A different account is already connected. Remove the existing link before approving this replacement.');
      } else if (destination && artist[platform] && String(artist[platform])!==destination.id) {
        throw new ArtistLinkConflictError('A different account is already connected. Remove the existing link before approving this replacement.');
      }
      const existing = await tx.execute(sql`select s.id,s.url from artist_vault_sources s where s.artist_id=${artistId}::uuid and s.status='approved' and s.id<>${input.id}::uuid
        and coalesce((select e.action from artist_activity_events e where e.artist_id=s.artist_id and e.source_id=s.id and e.action in ('link_hidden','link_shown','source_approved') order by e.created_at desc,e.id desc limit 1),'')<>'link_hidden'`);
      for (const source of existing) {
        const other = parseMusicDestination(String(source.url));
        if (destination && other?.kind==='artist' && other.platform===destination.platform && other.id!==destination.id) throw new ArtistLinkConflictError('A different account is already connected. Remove the existing link before approving this replacement.');
      }
    }
    if (restoring) {
      await recordArtistActivity(artistId,'link_shown',{userId,sourceId:input.id,trigger:'artist_link_review'},tx);
      return;
    }
    if (input.kind==='ugc') {
      if (approved && sourceBacked) await approveSourceBackedUgc(tx,artistId,userId,row);
      else if (approved) await approveUGC(input.id,artistId,String(row.site_name),String(row.site_username),tx);
      else await tx.execute(sql`update ugcresearch set accepted=false,date_processed=now(),updated_at=now() where id=${input.id}::uuid`);
      await recordArtistActivity(artistId,approved?'link_approved':'link_rejected',{userId,sourceId:input.id,trigger:'artist_link_review'},tx);
    } else {
      const status=approved?'approved':'rejected';
      await tx.execute(sql`update artist_vault_sources set status=${status}::source_status,updated_at=now() where id=${input.id}::uuid`);
      const activityId=await recordArtistActivity(artistId,approved?'source_approved':'source_rejected',{userId,sourceId:input.id,trigger:'artist_link_review'},tx);
      if(approved) await queueApprovedSourceExtraction(tx,{id:input.id,artistId,url,status,filePath:row.file_path as string|null,extractedText:row.extracted_text as string|null},activityId);
    }
  });
}
