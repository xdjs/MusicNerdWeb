import { sql } from "drizzle-orm";

/** Live scope for queries aliasing artist_research_jobs as j and artists as a. */
export function latestRefreshScopeSql() {
  return sql`j.state ? 'claimId'
    and (select c.id::text from artist_claims c where c.artist_id=a.id and c.status='approved' limit 1)
      is not distinct from (j.state->>'claimId')
    and exists (select 1 from users u where u.id::text=j.state->>'userId' and
      (u.is_admin or exists (select 1 from artist_claims c where c.artist_id=a.id and c.status='approved' and c.user_id=u.id)))
    and coalesce(a.instagram,'')=j.state->>'instagram'
    and coalesce(a.inprocess,'')=j.state->>'inprocess'
    and coalesce(a.spotify,'')=j.state->>'spotify'
    and coalesce(a.deezer,'')=j.state->>'deezer'`;
}
