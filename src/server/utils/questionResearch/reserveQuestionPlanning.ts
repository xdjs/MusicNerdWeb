import { sql } from "drizzle-orm";
import { db } from "@/server/db/drizzle";

/** Atomically bound public question planning before any model call; no visitor text is stored. */
export async function reserveQuestionPlanning(artistId: string): Promise<void> {
  await db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('musicnerd-question-planning-budget'))`);
    const [usage] = await tx.execute<{ global: number; artist: number }>(sql`
      select count(*)::int as global,
        count(*) filter(where artist_id=${artistId}::uuid)::int as artist
      from artist_activity_events
      where action='question_plan' and created_at>now()-interval '24 hours'`);
    if (!usage || ![usage.global, usage.artist].every(n => Number.isInteger(n) && n >= 0))
      throw new Error("Question planning budget unavailable");
    // Each research lane allows 5/artist and 100/global. Planning has their
    // combined ceiling, but does not grant any extra collection or answer slot.
    if (usage.artist >= 10 || usage.global >= 200)
      throw Object.assign(new Error("New-question planning limit reached"), {
        status: 429, code: "question_planning_quota",
      });
    const inserted = await tx.execute(sql`
      insert into artist_activity_events(artist_id,actor_user_id,actor_kind,action,trigger)
      values(${artistId}::uuid,null,'system','question_plan','ask_about_budget')
      returning id`);
    if (!inserted.length) throw new Error("Question planning reservation unavailable");
  });
}
