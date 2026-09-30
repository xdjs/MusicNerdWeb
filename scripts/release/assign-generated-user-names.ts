import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

async function main() {
  const { db } = await import('../../src/server/db/drizzle');
  const { sql } = await import('drizzle-orm');
  const { setUserName } = await import('../../src/server/utils/user/setUserName');
  const role = await db.execute(sql`select current_user as role`);
  if (role[0]?.role !== 'mnweb') throw new Error('Run with the application mnweb connection.');
  const rows = await db.execute(sql`select id from users where nullif(btrim(username), '') is null
    or username ~ '[^[:space:]@]+@[^[:space:]@]+'
    or lower(btrim(username)) = lower(btrim(wallet)) order by id`);
  console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'dry-run', eligible: rows.length }));
  if (!process.argv.includes('--apply')) return;
  for (const row of rows) await setUserName(String(row.id));
  console.log(JSON.stringify({ processed: rows.length }));
}
main().then(() => process.exit(0)).catch(error => { console.error(error instanceof Error ? error.message : 'Assignment failed'); process.exit(1); });
