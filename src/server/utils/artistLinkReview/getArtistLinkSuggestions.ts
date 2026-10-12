import { sql } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';
import { isDestinationSource } from '@/lib/musicLinks/isDestinationSource';
import { parseMusicDestination } from '@/lib/musicLinks/parseMusicDestination';
import { getUserDisplayName } from '@/lib/user/getUserDisplayName';
import type { LinkSuggestion } from '@/lib/artistLinkReview/types';
import { lockLinkReview } from './lockLinkReview';
/** Private, bounded owner projection. No email or wallet is returned to the browser. */
export async function getArtistLinkSuggestions(artistId: string, userId: string, offset=0) {
  if (!Number.isSafeInteger(offset) || offset<0 || offset>100000) throw new Error('Invalid page offset');
  return db.transaction(async tx => {
    await lockLinkReview(tx, artistId, userId);
    const rows = await tx.execute(sql`with suggestions as (
      select g.id,'ugc' as kind,g.ugc_url as url,g.site_name as title,g.site_name as platform,
        case when g.accepted then 'approved' when g.date_processed is not null then 'rejected' else 'pending' end as status,
        g.origin,g.created_at at time zone 'UTC' as submitted_at,g.user_id,null::text as type,g.date_processed at time zone 'UTC' as processed_at
      from ugcresearch g where g.artist_id=${artistId}::uuid and g.site_name is distinct from 'ugc_discord_ping'
        and not (g.accepted is true and exists(select 1 from artist_vault_sources linked where linked.artist_id=g.artist_id and linked.url=g.ugc_url))
      union all
      select s.id,'source',s.url,s.title,null,s.status::text,s.origin,s.created_at,e.actor_user_id,s.type,null::timestamptz
      from artist_vault_sources s left join artist_activity_events e on e.id=s.activity_id
      where s.artist_id=${artistId}::uuid and s.file_path is null and s.podcast_episode_key is null
    ) select s.*,u.username,u.wallet,u.is_hidden,r.action as review_action,coalesce(r.created_at,s.processed_at) as reviewed_at,r.actor_user_id as reviewer_id,ru.is_hidden as reviewer_hidden,ru.username as reviewer_name,ru.wallet as reviewer_wallet
    from suggestions s left join users u on u.id=s.user_id
    left join lateral (select created_at,actor_user_id,action from artist_activity_events where artist_id=${artistId}::uuid and source_id=s.id
      and action in ('link_approved','link_rejected','source_approved','source_rejected','link_hidden','link_shown') order by created_at desc,id desc limit 1) r on true
    left join users ru on ru.id=r.actor_user_id
    order by (s.status='pending') desc,s.submitted_at desc,s.id limit 101 offset ${offset}`);
    const items: LinkSuggestion[] = [];
    for (const row of rows.slice(0,100)) {
      const url = String(row.url ?? '');
      const destination = parseMusicDestination(url);
      if (!url || destination?.kind === 'release' || (row.kind === 'source' && !isDestinationSource({url,type:row.type as string|null}))) continue;
      items.push({id:String(row.id),kind:row.kind as 'ugc'|'source',url,title:String(row.title ?? destination?.label ?? 'Website'),platform:String(row.platform ?? destination?.platform ?? 'website'),
        hidden:row.review_action==='link_hidden',status:row.status as LinkSuggestion['status'],origin:String(row.origin), submittedAt:row.submitted_at ? new Date(row.submitted_at instanceof Date ? row.submitted_at.getTime() : String(row.submitted_at)).toISOString():null,
        suggestedBy:{id:row.user_id && !row.is_hidden ? String(row.user_id):null,name:row.origin==='research'?'Automated research':row.user_id && !row.is_hidden?getUserDisplayName({username:row.username as string|null,wallet:row.wallet as string|null}):'Not recorded'},
        reviewedAt:row.reviewed_at?new Date(row.reviewed_at instanceof Date ? row.reviewed_at.getTime() : String(row.reviewed_at)).toISOString():null,
        reviewedBy:row.reviewed_at?{id:row.reviewer_id && !row.reviewer_hidden?String(row.reviewer_id):null,name:row.reviewer_id && !row.reviewer_hidden?getUserDisplayName({username:row.reviewer_name as string|null,wallet:row.reviewer_wallet as string|null}):'Not recorded'}:null});
    }
    return {items,hasMore:rows.length>100,nextOffset:rows.length>100?offset+100:null};
  });
}
