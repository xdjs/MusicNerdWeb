# Analytics — Vercel Web Analytics

> Feature contract for [#1258](https://github.com/xdjs/MusicNerdWeb/issues/1258). Release status
> lives on the issue's PR matrix, not here.

## What is collected

Vercel Web Analytics records one **page view** per navigation on the public site
(`www.musicnerd.xyz`), on `staging.musicnerd.xyz` and on preview deployments. Each page view
carries the page URL (after the scrub below), referrer, country, device type, browser and OS.
Vercel derives a visitor id from a daily hash of IP and user agent; there are no cookies, no
consent banner and no user identity. Nothing from the app (session, email, artist source
content, research payloads) is attached to a page view.

The Vercel dashboard splits page views by `route` (`/artist/[id]`, `/leaderboard`, …) and by
`requestPath` (each artist page individually), so "which artists do people visit" needs no
custom event. Custom events (`track()`) are not used yet; they are Phase 2 on #1258 and must be
documented here before they are coded. The Pro plan allows two properties per custom event.

Speed Insights is a separate product with separate billing and is not enabled.

## Where the code is

| Piece | File |
| --- | --- |
| Client component that mounts the script | `src/app/_components/SiteAnalytics.tsx` |
| URL scrub applied before every event | `src/lib/analytics/scrubAnalyticsUrl.ts` |
| Mount point (once, after the footer) | `src/app/layout.tsx` |

`SiteAnalytics` renders `<Analytics />` from `@vercel/analytics/next` with a `beforeSend` that
maps the event URL through `scrubAnalyticsUrl` and drops the event when it returns `null`. The
component is a client component only because `beforeSend` is a function prop; nothing else in
the layout changes. There are no environment variables: for a project with Web Analytics
enabled, `@vercel/analytics` 2.x loads the script from a per-deployment hashed path
(`/<hash>/script.js`, not `/_vercel/insights/`) and posts page views to `/<hash>/view`. The
`src/middleware.ts` matcher is API-only, so those paths pass through untouched.

## The scrub rule

`scrubAnalyticsUrl(url)` is an **allowlist**, not a blocklist:

- Any URL whose path starts with `/admin` returns `null` — admin traffic is internal and is
  not reported.
- Every query parameter is removed **except** `utm_source`, `utm_medium`, `utm_campaign`,
  `utm_content` and `utm_term`, which are kept in their original order.
- The hash fragment is removed.
- Paths, hosts and everything else are returned unchanged.

So `/artist/<id>?search=abc` is reported as `/artist/<id>`, and
`/?utm_source=discord&utm_campaign=2026-09-showcase&x=1` as
`/?utm_source=discord&utm_campaign=2026-09-showcase`. A future query parameter (an auth
callback, a share token) cannot leak by default, because nothing new is reported until it is
added to the allowlist here and in the function.

## Campaign links

Not yet defined: a separate docs PR on #1258 adds the `utm_source` / `utm_medium` /
`utm_campaign` convention here. Note that the dashboard only breaks traffic down by UTM
parameter on the Web Analytics Plus add-on; without it the parameters are still recorded in the
URL but not aggregated.

## Reading the numbers

- Dashboard: the project's **Analytics** tab on Vercel (project `music-nerd`).
- Agents: the Vercel MCP `get_web_analytics` tool with `projectId: "music-nerd"`; `mode:
  "aggregate"` with `by: ["route"]` or `["requestPath"]` for the per-page split. Production
  only for counts since enablement; previews and staging are separated by the `environment`
  dimension.

## Verifying a change

On a preview deployment for the exact commit. The script is injected on mount, so it is not in
the server HTML, and it exits early when `navigator.webdriver` is true — an automated browser
must mask that (`Object.defineProperty(navigator, 'webdriver', { get: () => false })` before
any page script) or no beacon is ever sent.

1. `window.va` is a function and `window.vam` is `production`; the `/<hash>/script.js` request
   returns 200.
2. Each full or client-side navigation sends `POST /<hash>/view` (or `/event` for custom
   events) whose body field `o` is the reported URL and carries no query string other than
   `utm_*`; `dp` is the route pattern (`/artist/[id]`).
3. Visiting `/admin` or anything under it sends no `view` request.
4. `?search=abc` on the home page sends `o` without `search`.
5. No console errors from the script; both viewports, both themes.

The dashboard shows data for production within a day of the release; the MCP query above should
return non-zero rows for `route`.
