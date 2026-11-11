# Uncertain discovered account evidence (#1660)

Local candidate, not deployed. The existing Suggested links review adds a pending-only
Needs confirmation label for automated research, and Awaiting review for other origins.
When the API supplies recorded discovery evidence, the UI shows why it was suggested and
its recorded title as plain text. These observations are not proof of account ownership.
Old or unsupported records show an explicit missing-reason message; no reasons are backfilled
or generated for legacy suggestions. Reviewed suggestions keep their existing reviewed state.

Migration 0060 adds one nullable JSONB column to ugcresearch. No default, data backfill,
new table, index, RLS or permission expansion. The API serializes bounded, validated
structured observations, not model reasoning. Apply the reviewed migration using the
existing migration procedure before deploying the dependent API. Verify mnweb app-role
SELECT/INSERT access and RLS through the real authenticated workflow; an owner-only SQL
check is insufficient. The Web UI tolerates absent evidence from the prior API.

Do not claim this issue complete from fixture screenshots or local tests. A real signed-in
review and repeated-discovery acceptance remains necessary. No live profiles, provider
research or database changes are part of the local example.
