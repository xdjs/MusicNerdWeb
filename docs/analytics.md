# Analytics — Vercel Web Analytics

> Feature contract for [#1258](https://github.com/xdjs/MusicNerdWeb/issues/1258). Release status
> lives on the issue's PR matrix, not here.

## What is collected

Vercel Web Analytics records one **page view** per navigation on the public site
(`www.musicnerd.xyz`), on `staging.musicnerd.xyz` and on preview deployments. Each page view
carries the full page URL (query string included), referrer, country, device type, browser and OS.
Vercel derives a visitor id from a daily hash of IP and user agent; there are no cookies, no
consent banner and no user identity. Nothing from the app (session, email, artist source
content, research payloads) is attached to a page view.

The Vercel dashboard splits page views by `route` (`/artist/[id]`, `/leaderboard`, …) and by
`requestPath` (each artist page individually), so "which artists do people visit" needs no
custom event. Custom events (`track()`) are not used yet; they are Phase 2 on #1258 and must be
documented here before they are coded. The Pro plan allows two properties per custom event.

Speed Insights is a separate product with separate billing and is not enabled.

## Where the code is

`src/app/layout.tsx` renders `<Analytics />` from `@vercel/analytics/next` once, after the
providers. That is the whole integration: no client component, no environment variables. For a
project with Web Analytics enabled, `@vercel/analytics` 2.x loads the script from a
per-deployment hashed path (`/<hash>/script.js`, not `/_vercel/insights/`) and posts page views
to `/<hash>/view`. The `src/middleware.ts` matcher is API-only, so those paths pass through
untouched.

## What is in a page URL, and the redaction point

Page views report the URL as-is. Reviewed 2026-09-15 (#1275); the query strings the app puts
in a page URL are:

| URL | Set by | What it carries |
| --- | --- | --- |
| `/?search=<term>` | nav search | what the visitor typed; public, and worth seeing |
| `/add-artist?deezer=<id>&spotify=<id>` | search → add flow | public catalog ids |
| `/artist/<id>?addLink=<url>` | `DuplicateArtistChoice` → `AddArtistData` (one-shot handoff, removed with `history.replaceState` once consumed) | a Spotify or Deezer **artist page URL** that already passed `parseSupportedArtistUrl`, which accepts nothing else; public, and headed for the public directory |

Privy login is email-only and modal-based, so no OAuth codes reach a page URL, and NextAuth
lives under `/api/auth/*`, which is not a page view. The `addLink` handoff can also produce a
second page view for one visit (the `replaceState` that removes it is a route change to the
script); that is a rare, authenticated flow and is accepted rather than coded around.

If a route ever carries a token, an email address or user content in its URL, the redaction
point is the `beforeSend` prop on `<Analytics />` (return the event with a rewritten `url`, or
`null` to drop it) — see [Vercel's redaction guide](https://vercel.com/docs/analytics/redacting-sensitive-data).
Add it then, with a test, and update this section.

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
   events) whose body field `o` is the page URL and `dp` the route pattern (`/artist/[id]`).
3. No console errors from the script; both viewports, both themes.

The dashboard shows data for production within a day of the release; the MCP query above should
return non-zero rows for `route`.
