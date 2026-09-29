# Artist Lore review attribution

Issue #1385. In the authorized artist/admin Lore editor, each pending and approved source
shows its recorded origin and creation date. Direct suggestions say “Suggested by …”,
uploads “Uploaded by …”, research “Found by automated research”, and historical unknown
origins “Contributor unknown”. Creation time is the time added to Music Nerd, never the
source's publication date or later update time. Dates are rendered consistently in UTC.

The server enriches editor sources from their original activity reference in one batched
query, constrained to the same artist. Only a non-hidden contributor's username is projected;
missing names use “a contributor”. No emails, wallets, user IDs, triggers or raw audit events
are added to client props. Automated research never labels its requester as the submitter.
Anonymous visitors and non-owners receive no contributor enrichment. Public Lore cards and
existing moderation authorization remain unchanged. No schema migration or historical backfill.
