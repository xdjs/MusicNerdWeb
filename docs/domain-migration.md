# Primary domain migration

Tracking: [#1427](https://github.com/xdjs/MusicNerdWeb/issues/1427).
Carl selected `https://musicnerd.net` as the primary website on October 5, 2026.
`www.musicnerd.net` redirects to the bare domain. Existing `.xyz` website hosts
will redirect with paths and query strings preserved. Carl confirmed that service
hosts retain their names on `.net`, including staging, API, TV, Grapevine and
Roomtone. `wb0.musicnerd.xyz` is retired into the public-site redirect. Provider
verification records and email records remain service records, not web redirects.

## Contract

Generated public website URLs (artist metadata, share links, relative image URLs,
sitemap, robots, LLM orientation and email-link fallback) use `musicnerd.net`.
Existing external source URLs, user content and verified email sender addresses
are not rewritten. Staging and production retain separate deployments and data.
The production release verifier checks the `musicnerd.net` alias against the
approved deployment. Staging moves to `staging.musicnerd.net`, and the release verifier requires exactly
that one domain on the staging environment. Coordinate switching the old staging
host to a redirect with the reviewed release; no other release can be in flight.

DNS stays at Squarespace. Vercel owns HTTPS and domain redirects. Prepare the new
host and verify the existing production deployment before redirecting old traffic.
The domain assignment does not authorize bypassing the protected production build.
No persistence changes, database migration or research jobs are required.

## Active references and historical records

Current setup instructions, executable defaults, sample configuration and User-Agent
website URLs use the new `.net` hosts. Use the bare `musicnerd.net` apex for public
Web links and retain the service prefix for API, MCP staging and Grapevine links.
Ordinary test origins follow these addresses too.

Historical plans, transcripts and handoffs keep the URLs they recorded. Explicit
old-host migration examples and negative regression cases also retain `.xyz`.
Email addresses and sender-domain instructions are unchanged. Social account
identifiers are not website URLs and require a separate identity check before changing.
This cleanup covers Web, TV and Grapevine; it does not rewrite stored artist data.

## Cutover

1. Save the DNS, forwarding rules and Vercel deployment/domain assignments privately.
2. Add the new apex and www to Vercel. Remove the existing Squarespace temporary
   `.net` → `.xyz` forwarding rule, then use Vercel's project-specific A/CNAME
   recommendations. Preserve MX, mail verification and email-security records.
3. Configure production `NEXTAUTH_URL=https://musicnerd.net`; verify the production
   Privy app accepts the new origin. Environment changes require a new build.
   Verify any service-origin allowlists and configured Grapevine URL as applicable.
4. Merge and release the reviewed URL changes through the existing staging and
   protected production jobs. Verify actual sign-in and logout on `.net`; cookies
   and local storage from `.xyz` do not automatically move between domains.
5. Only after the destination passes, set permanent Vercel redirects for the old
   hosts. Explicit DNS and project domains take precedence over wildcard entries.
   Nested hosts such as `staging.mntv.musicnerd.xyz` need explicit coverage.
6. For wildcard HTTPS while retaining Squarespace nameservers, use Vercel's
   documented `_acme-challenge` NS delegation only after checking for conflicting
   certificate users. A wildcard DNS record alone does not configure redirects
   or issue a certificate.
7. Verify HTTP and HTTPS, paths and queries, real artist pages, login/logout,
   sitemap/robots/metadata, service entry points and staging environment identity.
   Record observed results and unresolved checks on the issue.

If a destination fails, restore the affected old-host mapping and redirect from
the snapshot. Keep the old domain registration and mail records in place.

## References

- [Release gates](releases.md)
- [Vercel redirects](https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting)
- [External DNS and wildcard HTTPS](https://vercel.com/docs/domains/working-with-domains/add-a-domain#use-wildcard-domains-with-an-external-dns-provider)
