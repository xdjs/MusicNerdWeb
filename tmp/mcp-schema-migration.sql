-- MCP Schema Migration
-- Run as postgres role (or any role with CREATE TABLE privileges)
--
-- NOTE: If DEFAULT PRIVILEGES are configured for the mnweb role (as on Supabase),
-- the GRANT statements below are redundant but harmless. They are included
-- explicitly to ensure the migration works regardless of default privilege setup.

-- ============================================================================
-- mcp_api_keys
-- ============================================================================
CREATE TABLE IF NOT EXISTS mcp_api_keys (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
  key_hash text NOT NULL UNIQUE,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

-- GRANTs for mnweb role
GRANT SELECT, INSERT, UPDATE, DELETE ON mcp_api_keys TO mnweb;

-- RLS
ALTER TABLE mcp_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mnweb_select_mcp_api_keys" ON mcp_api_keys AS PERMISSIVE FOR SELECT TO mnweb USING (true);
CREATE POLICY "mnweb_insert_mcp_api_keys" ON mcp_api_keys AS PERMISSIVE FOR INSERT TO mnweb WITH CHECK (true);
CREATE POLICY "mnweb_update_mcp_api_keys" ON mcp_api_keys AS PERMISSIVE FOR UPDATE TO mnweb;
CREATE POLICY "mnweb_delete_mcp_api_keys" ON mcp_api_keys AS PERMISSIVE FOR DELETE TO mnweb USING (true);

-- ============================================================================
-- mcp_audit_log (append-only — no UPDATE/DELETE policies for mnweb)
-- ============================================================================
CREATE TABLE IF NOT EXISTS mcp_audit_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
  artist_id uuid NOT NULL REFERENCES artists(id),
  field text NOT NULL,
  action text NOT NULL,
  submitted_url text,
  old_value text,
  new_value text,
  api_key_hash text NOT NULL,  -- Intentionally not a FK — audit records survive key deletion
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for audit log lookups by artist
CREATE INDEX idx_mcp_audit_log_artist_id ON mcp_audit_log USING btree (artist_id);

-- GRANTs for mnweb role (SELECT + INSERT only — append-only table)
GRANT SELECT, INSERT ON mcp_audit_log TO mnweb;

-- RLS (append-only: SELECT + INSERT only)
ALTER TABLE mcp_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mnweb_select_mcp_audit_log" ON mcp_audit_log AS PERMISSIVE FOR SELECT TO mnweb USING (true);
CREATE POLICY "mnweb_insert_mcp_audit_log" ON mcp_audit_log AS PERMISSIVE FOR INSERT TO mnweb WITH CHECK (true);
