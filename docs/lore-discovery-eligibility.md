# Automatic Lore source eligibility — #1303

September 21, 2026. Local implementation, not released.

Automatic Lore discovery excludes linkedin.com and its subdomains, plus LinkedIn's
lnkd.in short links. Match the parsed hostname (case-insensitive, allowing a DNS
trailing dot), not arbitrary mentions in a URL path/query. Profile, company, feed,
and other LinkedIn paths all follow this policy. Non-LinkedIn artist coverage
continues through the existing identity/relevance/verification checks.

Apply this deterministic eligibility rule before fetching/judging search results,
after grounding redirects resolve, after ordinary HTTP redirects resolve, and to
articles followed from indexes. It must not depend on a model verdict or whether
the LinkedIn page is readable: even a namesake profile that matches the artist's
name cannot become an automatic pending source.

fetchPageContent reports the response's resolved URL, including on non-2xx responses.
The automatic caller checks it before judging or persistence. This records metadata
only; manual content fetch/verification behavior stays unchanged. Unknown redirect
destinations on failed network requests cannot be inferred. Known LinkedIn/lnkd.in
inputs are still excluded before that request happens.

Artist-provided URLs retain existing authenticated submission and approval behavior;
there is no new manual LinkedIn ban. Do not change generic insertVaultSource,
source relevance scoring, citation eligibility, existing approvals, or stored rows.
No database migration, page-read writes, new jobs, or external model calls are added.

For separately reviewed cleanup, identify stored LinkedIn/lnkd.in URLs across all
statuses with the read-only query in scripts/audit-linkedin-lore.sql. A match is an
inventory candidate, not permission to delete: the schema does not reliably record
whether every historical row was submitted manually. Redirect aliases that were
stored without their final destination cannot be identified by this query alone.

## Existing public example

Read-only inspection on September 21 found a Lore card on Jordan Rein's public
artist page linking to `https://www.linkedin.com/in/jordan-rein-79903796`.
This captures a current LinkedIn source matching the reported category; it does
not independently establish who owns that LinkedIn account or how the row entered
the vault. No source was removed and no database cleanup was run.

## Local verification

65 focused tests passed for URL eligibility, discovery filtering and response-URL
metadata/manual fetch behavior. Full npm run ci passed: 254 suites, 2724 passing
tests and 6 skips; types, lint (existing warnings), stub-env production build.
Search/model providers, fetched pages and database writes are mocked in discovery
regressions. No paid/live discovery run or authenticated onboarding save was executed.
The public Jordan page inspection was read-only. No schema change is needed.
