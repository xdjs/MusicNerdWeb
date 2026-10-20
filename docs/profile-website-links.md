# Profile website destinations — #1583

Approved website sources belong in Links alongside the other destination icons.
Support provider classification and genuine editorial Lore retain their existing rules.
The saved Tim/Skipless walkthrough at 60:00 shows two `theelliscourt.com` pills,
but does not expose their exact hrefs. The historical misplaced-URL inventory remains
unresolved; no reclassification of unknown records is justified by that frame.

Website presentation compares canonical URL serialization (host casing, default ports,
and root slash) against both direct and source-backed destinations.
Keep path case, non-root trailing slashes, scheme, www host, query parameters and fragments:
those can identify different destinations without redirect evidence. Keep original hrefs
and source identities; do not rewrite records, approvals, provenance or removal history.

Website sources use the existing icon grid. As before, website review/removal stays
in Lore; the grid does not introduce a Remove action that could leave an equivalent
source visible after removing only one row. Platform source removal is unchanged. Pending,
rejected and blocked records remain hidden. This changes presentation only; database,
research jobs, providers and mutation authorization are unchanged.

Before a PR is ready, verify the exact commit preview at 832px and 390×844 (2×,
touch), light/dark, public/edit views. Capture Links, Support and Lore, usable website
icon, duplicate variants, distinct URLs and negative/private cases. Record the exact preview SHA and screenshots with the PR. Pete is the requested reviewer; an acceptance owner still needs
confirmation separately from issue assignment.

The non-production `/dev/website-links-preview` route compares illustrative before
pills with the actual fixed grid using local fixtures. It is disabled on production,
uses no artist query, and provides no mutation controls in the fixture. The app shell
still mounts auth/navigation; review logged out and avoid global add/login actions. It proves rendering, not the
historical URL inventory or persisted-record equivalence. Later authorization on
2026-10-20 permits a feature-branch preview before any main merge.
