import { sql } from "drizzle-orm";

/** Approved public eligibility; immutable submission trust never overrides explicit privacy or moderation. */
export function publicVaultSourceSql() {
  return sql`v.status='approved' and (
  v.publication='public' or (v.publication='inherit' and (
   exists(select 1 from artist_claims claim where claim.artist_id=v.artist_id and claim.status='approved')
   or exists(select 1 from artist_activity_events contribution
    where contribution.id=v.activity_id and contribution.artist_id=v.artist_id and contribution.source_id=v.id
    and contribution.actor_kind='user' and contribution.actor_user_id is not null and contribution.trigger='trusted_submission'
    and ((v.origin='upload' and contribution.action='source_upload') or (v.origin='submission' and contribution.action='source_submission')))
  )))`;
}
