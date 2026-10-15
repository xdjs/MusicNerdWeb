import { sql } from "drizzle-orm";
import { db } from "@/server/db/drizzle";

/** Atomically bound new question planning; visitor digests never enter the audit log. */
export async function reserveQuestionPlanning(artistId: string, visitorKey: string): Promise<void> {
  if (!/^[a-f0-9]{64}$/.test(visitorKey)) throw new Error("Question planning visitor key unavailable");
  const denied = await db.transaction(async tx => {
    // This shared lock also coordinates with earlier deployments that reserve
    // only the global audit budget. Never hold it during a model/network call.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('musicnerd-question-planning-budget'))`);
    await tx.execute(sql`delete from question_planning_admissions
      where admitted_at<=clock_timestamp()-interval '1 hour'`);
    const [usage] = await tx.execute<{
      global: number; visitor: number; admitted_at: string; now_ms: number;
      global_reset_ms: number | null; visitor_reset_ms: number | null;
    }>(sql`
      with clock as materialized (select clock_timestamp() as at),
      visitor_admissions as materialized (
        select admitted_at from question_planning_admissions,clock
        where visitor_key=${visitorKey} and admitted_at>clock.at-interval '1 hour'
      ), global_admissions as materialized (
        select created_at from artist_activity_events,clock
        where action='question_plan' and created_at>clock.at-interval '24 hours'
      )
      select (select count(*)::int from global_admissions) as global,
        (select count(*)::int from visitor_admissions) as visitor,
        clock.at::text as admitted_at,
        (extract(epoch from clock.at)*1000)::double precision as now_ms,
        (select (extract(epoch from created_at+interval '24 hours')*1000)::double precision
          from global_admissions order by created_at desc offset 199 limit 1) as global_reset_ms,
        (select (extract(epoch from admitted_at+interval '1 hour')*1000)::double precision
          from visitor_admissions order by admitted_at desc offset 29 limit 1) as visitor_reset_ms
      from clock`);
    if (!usage || ![usage.global, usage.visitor].every(n => Number.isInteger(n) && n >= 0)
      || !Number.isFinite(usage.now_ms)) throw new Error("Question planning budget unavailable");
    const gates = [
      { used: usage.global, limit: 200, reset: usage.global_reset_ms, code: "question_planning_quota" },
      { used: usage.visitor, limit: 30, reset: usage.visitor_reset_ms, code: "visitor_question_quota" },
    ].filter(gate => gate.used >= gate.limit);
    if (gates.length) {
      if (gates.some(gate => gate.reset === null || !Number.isFinite(gate.reset) || gate.reset <= usage.now_ms))
        throw new Error("Question planning reset unavailable");
      // If both gates apply, report the later reset. Selecting the 200th/30th
      // newest admission also works if historical usage exceeds today's limit.
      const gate = gates.reduce((later, next) => next.reset! > later.reset! ? next : later);
      return {
        status: 429, code: gate.code,
        retryAfterSeconds: Math.max(1, Math.ceil((gate.reset! - usage.now_ms) / 1000)),
        resetAt: new Date(Math.ceil(gate.reset!)).toISOString(),
      };
    }
    await tx.execute(sql`
      insert into question_planning_admissions(visitor_key,admitted_at)
      values(${visitorKey},${usage.admitted_at}::timestamptz)`);
    const inserted = await tx.execute(sql`
      insert into artist_activity_events(artist_id,actor_user_id,actor_kind,action,trigger,created_at)
      values(${artistId}::uuid,null,'system','question_plan','ask_about_budget',${usage.admitted_at}::timestamptz)
      returning id`);
    if (!inserted.length) throw new Error("Question planning reservation unavailable");
    return null;
  });
  // Denial still commits expired-digest pruning. Admission/audit insertion
  // failures throw inside the transaction and roll both records back together.
  if (denied) throw Object.assign(new Error("New-question planning limit reached"), denied);
}
