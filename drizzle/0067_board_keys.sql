-- Refs MusicNerdWeb#1696: board agent keys are MCP keys that name the team member they belong to.
-- Additive and nullable: existing (admin) keys stay null and keep working. Apply before the
-- MusicNerdAPI board keys PR deploys. mnweb's existing table-wide policies cover the new column.
ALTER TABLE "mcp_api_keys" ADD COLUMN IF NOT EXISTS "board_member" text;
