-- Drop the MCP API key, MCP audit log and agent report tables (#1696). Destructive.
-- Nothing has written to them since 2026-04-01; /mcp moves to OAuth and the ID-mapping agent is retired.
-- Apply only after the MusicNerdAPI cleanup that stops reading and writing them is deployed to the
-- same environment. No foreign keys, views or triggers depend on these tables; their own policies,
-- indexes and foreign keys go with them. No CASCADE, so a new dependent object fails the migration.
BEGIN;
SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
DROP TABLE "mcp_audit_log";--> statement-breakpoint
DROP TABLE "mcp_api_keys";--> statement-breakpoint
DROP TABLE "agent_runs";--> statement-breakpoint
DROP TABLE "agent_heartbeats";--> statement-breakpoint
COMMIT;
