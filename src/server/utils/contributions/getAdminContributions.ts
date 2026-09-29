import { sql } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';

export type Contribution = {
  id: string; type: 'link' | 'lore' | 'upload'; origin: 'user' | 'research' | 'unknown';
  artistId: string; artistName: string | null; title: string | null; url: string | null;
  userId: string | null; username: string | null; email: string | null; actorKind: string | null;
  status: string; createdAt: string | null; trigger: string | null; activityId: string | null;
};
export type ContributionCounts = Record<Contribution['origin'], { total: number; pending: number }>;

/** Private projection: callers must authorize the live admin role before querying. */
export async function getAdminContributions(options: {
  userId?: string; query?: string; origin?: string; type?: string; status?: string; page?: number;
} = {}) {
  const userId = options.userId ?? '';
  const query = (options.query ?? '').trim().slice(0, 100);
  const origin = ['user', 'research', 'unknown'].includes(options.origin ?? '') ? options.origin! : '';
  const type = ['link', 'lore', 'upload'].includes(options.type ?? '') ? options.type! : '';
  const status = ['all', 'approved', 'rejected'].includes(options.status ?? '') ? options.status! : 'pending';
  const validUser = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(userId);
  const pattern = `%${query.replace(/[\\%_]/g, '\\$&')}%`;
  const base = sql`with contributions as (
    select g.id, 'link'::text as type,
      case when g.origin = 'submission' then 'user' when g.origin = 'research' then 'research' else 'unknown' end as origin,
      g.artist_id, g.user_id, g.site_name as title, g.ugc_url as url,
      case when g.accepted then 'approved' when g.date_processed is not null then 'rejected' else 'pending' end as status,
      g.created_at at time zone 'UTC' as created_at, null::text as trigger, null::uuid as activity_id,
      case when g.user_id is not null then 'user' else 'unknown' end as actor_kind
    from ugcresearch g where g.site_name is distinct from 'ugc_discord_ping' and g.artist_id is not null
    union all
    select s.id, case when s.file_path is not null or s.origin = 'upload' then 'upload' else 'lore' end,
      case when s.origin in ('submission', 'upload') then 'user' when s.origin = 'research' then 'research' else 'unknown' end,
      s.artist_id, e.actor_user_id, s.title, s.url, s.status::text, s.created_at, e.trigger, s.activity_id, e.actor_kind
    from artist_vault_sources s left join artist_activity_events e on e.id = s.activity_id
  ), scoped as (
    select c.*, a.name as artist_name, u.username, u.email
    from contributions c join artists a on a.id = c.artist_id left join users u on u.id = c.user_id
    where ${userId ? validUser ? sql`c.user_id = ${userId}::uuid` : sql`false` : sql`true`}
      and ${type ? sql`c.type = ${type}` : sql`true`}
      and ${query ? sql`(a.name ilike ${pattern} or c.title ilike ${pattern} or c.url ilike ${pattern} or u.username ilike ${pattern} or u.email ilike ${pattern})` : sql`true`}
  )`;
  const selected = sql`${origin ? sql`origin = ${origin}` : sql`true`} and ${status === 'all' ? sql`true` : sql`status = ${status}`}`;
  const [groups, matches] = await Promise.all([
    db.execute(sql`${base} select origin, count(*)::int as total, count(*) filter (where status = 'pending')::int as pending from scoped group by origin`),
    db.execute(sql`${base} select count(*)::int as total from scoped where ${selected}`),
  ]);
  const counts: ContributionCounts = { user: { total: 0, pending: 0 }, research: { total: 0, pending: 0 }, unknown: { total: 0, pending: 0 } };
  for (const row of groups) {
    if (row.origin === 'user' || row.origin === 'research' || row.origin === 'unknown') counts[row.origin] = { total: Number(row.total), pending: Number(row.pending) };
  }
  const total = Number(matches[0]?.total ?? 0);
  const pageSize = 25;
  const page = Math.min(Number.isSafeInteger(options.page) && options.page! > 0 ? options.page! : 1, Math.max(1, Math.ceil(total / pageSize)));
  const rows = await db.execute(sql`${base} select id, type, origin, artist_id as "artistId", artist_name as "artistName", title, url,
    user_id as "userId", username, email, actor_kind as "actorKind", status, created_at::text as "createdAt", trigger, activity_id as "activityId"
    from scoped where ${selected} order by created_at desc nulls last, type, id desc limit ${pageSize} offset ${(page - 1) * pageSize}`);
  return { items: [...rows] as Contribution[], counts, total, page, pageSize, userId, query, origin, type, status };
}
