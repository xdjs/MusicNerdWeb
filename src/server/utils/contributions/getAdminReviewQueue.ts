import { sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth-helpers';
import type { ReviewItem, ReviewType } from '@/lib/contributions/adminReviewTypes';
import { db } from '@/server/db/drizzle';

/** One globally ordered pending queue. Authorization also protects counts and search. */
export async function getAdminReviewQueue(options: {type?: string; query?: string; page?: number} = {}) {
  const auth = await requireAdmin();
  if (!auth.authenticated) throw new Error('Administrator access required');
  const type: ReviewType | 'all' = options.type === 'links' || options.type === 'sources' || options.type === 'corrections' ? options.type : 'all';
  const query = (options.query ?? '').trim().slice(0, 100);
  const pattern = `%${query.replace(/[\\%_]/g, '\\$&')}%`;
  const base = sql`with pending as (
    select g.id, 'links'::text as type, g.artist_id, g.user_id as actor_id,
      g.site_name as title, g.ugc_url as url, g.created_at at time zone 'UTC' as created_at,
      case when g.origin = 'submission' then 'user' when g.origin = 'research' then 'research' else 'unknown' end as origin,
      null::uuid as activity_id, null::text as trigger, null::text as bio_snapshot,
      null::text as details, null::text as reason, case when g.user_id is not null then 'user' else 'unknown' end as actor_kind
    from ugcresearch g
    where g.accepted is not true and g.date_processed is null and g.site_name is distinct from 'ugc_discord_ping'
    union all
    select s.id, 'sources', s.artist_id, e.actor_user_id, s.title, s.url, s.created_at,
      case when s.origin in ('submission', 'upload') then 'user' when s.origin = 'research' then 'research' else 'unknown' end,
      s.activity_id, e.trigger, null::text, null::text, null::text, e.actor_kind
    from artist_vault_sources s left join artist_activity_events e on e.id = s.activity_id
    where s.status = 'pending'
    union all
    select c.id, 'corrections', c.artist_id, c.user_id, c.reason, c.source_url, c.created_at,
      'user', null::uuid, null::text, c.bio_snapshot, c.details, c.reason, 'user'
    from artist_bio_corrections c where c.status = 'pending'
  ), scoped as (
    select p.*, a.name as artist_name, u.username as actor_name
    from pending p join artists a on a.id = p.artist_id left join users u on u.id = p.actor_id
    where ${query ? sql`(a.name ilike ${pattern} or p.title ilike ${pattern} or p.url ilike ${pattern} or p.details ilike ${pattern} or u.username ilike ${pattern} or u.email ilike ${pattern})` : sql`true`}
  )`;
  const [groups, pendingGroups] = await Promise.all([
    db.execute(sql`${base} select type, count(*)::int as total from scoped group by type`),
    db.execute(sql`${base} select p.type, count(*)::int as total from pending p join artists a on a.id = p.artist_id group by p.type`),
  ]);
  const counts: Record<ReviewType, number> = {links: 0, sources: 0, corrections: 0};
  for (const row of groups) {
    if (row.type === 'links' || row.type === 'sources' || row.type === 'corrections') counts[row.type] = Number(row.total);
  }
  const pendingCounts: Record<ReviewType, number> = {links: 0, sources: 0, corrections: 0};
  for (const row of pendingGroups) {
    if (row.type === 'links' || row.type === 'sources' || row.type === 'corrections') pendingCounts[row.type] = Number(row.total);
  }
  const total = type === 'all' ? counts.links + counts.sources + counts.corrections : counts[type];
  const pageSize = 25;
  const page = Math.min(Number.isSafeInteger(options.page) && options.page! > 0 ? options.page! : 1, Math.max(1, Math.ceil(total / pageSize)));
  const rows = await db.execute(sql`${base} select id, type, artist_id as "artistId", artist_name as "artistName", title, url,
    created_at::text as "createdAt", origin, actor_name as "actorName", actor_id as "actorId", activity_id as "activityId",
    trigger, actor_kind as "actorKind", bio_snapshot as "bioSnapshot", details, reason
    from scoped where ${type === 'all' ? sql`true` : sql`type = ${type}`}
    order by created_at desc nulls last, type, id desc limit ${pageSize} offset ${(page - 1) * pageSize}`);
  return {items: [...rows] as ReviewItem[], counts, pendingCounts, total, page, pageSize, type, query};
}
