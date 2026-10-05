'use server';

import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/server/db/drizzle';
import { CONTRIBUTOR_PREVIEW_LIMIT, type ContributorApprovalItem } from '@/lib/contributions/contributorApprovalTypes';

/** Admin-only preview of direct submissions across every history page. */
export async function getContributorApprovalItems(contributorId: string): Promise<{
  success: boolean; items?: ContributorApprovalItem[]; hasMore?: boolean; error?: string;
}> {
  try {
    const auth = await requireAdmin();
    if (!auth.authenticated) return { success: false, error: 'Admin access required.' };
    if (!z.string().uuid().safeParse(contributorId).success) return { success: false, error: 'Choose a contributor.' };
    const rows = await db.execute(sql`
      with pending as (
        select g.id, 'link'::text as type, g.site_name as title, g.ugc_url as url, g.artist_id,
          g.created_at at time zone 'UTC' as created_at
        from ugcresearch g where g.user_id = ${contributorId}::uuid and g.origin = 'submission'
          and g.accepted is not true and g.date_processed is null
          and g.artist_id is not null and g.site_name is distinct from 'ugc_discord_ping'
        union all
        select s.id, case when s.file_path is not null or s.origin = 'upload' then 'upload' else 'lore' end,
          s.title, s.url, s.artist_id, s.created_at
        from artist_vault_sources s join artist_activity_events e on e.id = s.activity_id
        where e.actor_user_id = ${contributorId}::uuid and s.origin in ('submission', 'upload') and s.status = 'pending'
      ) select p.id, p.type, p.title, p.url, a.name as "artistName"
        from pending p join artists a on a.id = p.artist_id
        order by p.created_at asc nulls first, p.type, p.id limit ${CONTRIBUTOR_PREVIEW_LIMIT + 1}
    `);
    return { success: true, items: [...rows].slice(0, CONTRIBUTOR_PREVIEW_LIMIT) as ContributorApprovalItem[], hasMore: rows.length > CONTRIBUTOR_PREVIEW_LIMIT };
  } catch (error) {
    console.error('[getContributorApprovalItems] Could not load pending submissions', error);
    return { success: false, error: 'Could not load pending submissions. Please try again.' };
  }
}
