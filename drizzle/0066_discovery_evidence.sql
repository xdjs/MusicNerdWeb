-- #1660: optional bounded observations for newly discovered account suggestions.
-- No backfill, default, index, permission change or claim of ownership.
-- Apply with the authorized DDL role before deploying the dependent API.
ALTER TABLE public.ugcresearch ADD COLUMN discovery_evidence jsonb;
