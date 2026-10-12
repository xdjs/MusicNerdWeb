import { db } from '@/server/db/drizzle';
import { sql } from 'drizzle-orm';
import { canonicalizeLoreUrl } from '@/lib/source/canonicalizeLoreUrl';
import { ArtistLinkConflictError } from '@/server/utils/artistLinks/ArtistLinkConflictError';
import { parseMusicDestination } from '@/lib/musicLinks/parseMusicDestination';
import { insertVaultSource } from '@/server/utils/queries/insertVaultSource';
import { reviewArtistLinkSuggestion } from './reviewArtistLinkSuggestion';
/** Source-backed platforms use the same attributed pending source queue as Lore. */
export async function submitArtistDestination(artistId:string,userId:string,url:string,approve=false) {
  const destination=parseMusicDestination(url);
  if(destination?.kind!=='artist' || !['apple_music','beatport'].includes(destination.platform))throw new Error('Enter an Apple Music or Beatport artist page, not a song or album.');
  const source=await insertVaultSource({artistId,url,title:destination.label,type:'profile',status:'pending'},undefined,{userId,trigger:'link_submission'});
  if(!source) {
    if (approve) {
      const [existing]=await db.execute(sql`select id,status from artist_vault_sources where artist_id=${artistId}::uuid and url=${canonicalizeLoreUrl(url) ?? url}`);
      if(existing && (existing.status==='pending' || existing.status==='approved')) {
        await reviewArtistLinkSuggestion(artistId,userId,{kind:'source',id:String(existing.id),decision:existing.status==='approved'?'restore':'approve'});
        return {id:String(existing.id),platform:destination.platform==='apple_music'?'applemusic':destination.platform,label:destination.label};
      }
    }
    throw new ArtistLinkConflictError('This link has already been suggested. Review it in Lore.');
  }
  if(approve)await reviewArtistLinkSuggestion(artistId,userId,{kind:'source',id:source.id,decision:'approve'});
  return {id:source.id,platform:destination.platform==='apple_music'?'applemusic':destination.platform,label:destination.label};
}
