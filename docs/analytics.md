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
custom event. Everything that happens on a page without changing its URL — clicks out,
submissions, dialogs, outcomes — is a **custom event**, listed below. The Pro plan allows two
properties per custom event, and every custom event also carries the page URL, so an event fired
on `/artist/<id>` already identifies the artist without spending a property on it.

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

## Custom events

Nine events, approved on [#1258](https://github.com/xdjs/MusicNerdWeb/issues/1258) on
2026-09-15. Names and properties are typed in `src/lib/analytics/events.ts`; adding an event or
a property means changing that file, this table, and the fire point together. Values are short
lower-case tokens; free text appears only where the table says so.

| Event | Fires when | Properties | Side | Question it answers |
| --- | --- | --- | --- | --- |
| `search` | A search result is chosen, or a completed search shows "No artists found" (`nav/SearchBar.tsx`) | `outcome` = `existing` · `external` · `none`; `query` = the typed text | client | What do people look for, and how often is it an artist we don't have? |
| `outbound_click` | Any click on an off-site link on an artist page (`OutboundClickTracker`, one delegated listener) | `platform` = from the hostname (`spotify`, `instagram`, `bandcamp`, `inprocess`, …, else the bare hostname); `surface` = the enclosing `mn-*` section id (`about`, `latest`, `links`, `lore`, `sources`, `knowledge`, `ask`) or `page` | client | Which platforms we send people to, and whether Latest and Ask deliver a listen |
| `add_link_submit` | A visitor's add-link form resolves (`AddArtistData.tsx`, non-owner path) | `platform` = site name from the response or `null`; `result` = `success` · `invalid` · `error` | client | Are listeners contributing, and where the flow fails |
| `claim` | Each step of the claim flow (`ClaimButton.tsx`) | `step` = `start` · `login_required` · `submitted` · `already_claimed` · `error` | client | The artist funnel's front door; `start` → `submitted` is the drop-off |
| `ask_question` | The Ask route returns (`api/askArtist`) | `outcome` = `answered` (from our sources) · `open_web` (Gemini fell back to the open web) · `error`; `sources` = number of cited sources | server | Is Ask used, and does our research answer it? A high `open_web` rate for an artist means their research is thin |
| `latest_card_open` | A Latest card dialog opens (`LatestCards.tsx`) | `kind` = `release` · `instagram` · `interview` · `moment`; `filter` = the active tab | client | Which content kind earns a click |
| `interview_answer` | An artist saves or skips an interview question (`actions/interviewActions.ts`) | `question` = the question key; `skipped` = true when saved without an answer | server | Are claimed artists producing "In their words" |
| `profile_edit` | A claimed artist changes their profile | `action` = `link_add` · `link_remove` · `reorder` · `photo` · `vault_upload` · `dismiss`; `target` = platform for link actions, else `null` | server | Do artists maintain their profile after claiming |
| `login` | A NextAuth session is created after Privy login and the page reloads (`PrivyLogin.tsx`) | `trigger` = which surface asked for login (`nav`, `search_add`, `add_link`, `claim`, `add_artist`, `dashboard`, `please_login`); `new` = Privy's `isNewUser` | client | What converts a visitor into an account; new vs returning |

Fire points for `profile_edit`: `api/directEditLink` (`set` → `link_add`, `clear` → `link_remove`),
`api/removeArtistData` (`link_remove`), `api/artist/link-order` (`reorder`),
`api/artist/profile-image` (`photo`), `api/vault/upload/complete` (`vault_upload`),
`actions/dismissLegacyLink` (`dismiss`).

Deviations from the approved table, because of what the code knows at the fire point:
`ask_question.outcome` distinguishes `open_web` (the route already tracks its fallback);
`interview_answer` reports the question key and a skipped flag rather than a sitting number,
which the action hard-codes; `claim` has no `via` because `ClaimButton` is its only caller.

What is deliberately **not** sent: the Ask question text, the submitted link URL, any email,
session or user id, artist source content. `search.query` is the one free-text property and is
the point of that event.

### How events are sent

- Client: `trackEvent(name, props)` in `src/lib/analytics/trackEvent.ts` wraps `track` from
  `@vercel/analytics`; it never throws. The Vercel script drops events when
  `navigator.webdriver` is true, so automated checks must mask that (see below).
- Server: `trackServerEvent(name, props)` in `src/server/utils/analytics/trackServerEvent.ts`
  wraps `track` from `@vercel/analytics/server`, which reads the request headers and
  `waitUntil` from Vercel's request context on its own and never fails the request. Outside
  Vercel (local, tests) it logs and returns.
- Login needs two steps because the page reloads after `signIn`: `requestLogin(trigger)` stores
  the trigger and opens Privy; after the reload `takeCompletedLogin()` reads it back and fires
  the event once.

## Reading the numbers

- Dashboard: the project's **Analytics** tab on Vercel (project `music-nerd`).
- Agents: the Vercel MCP `get_web_analytics` tool with `projectId: "music-nerd"`; `mode:
  "aggregate"` with `by: ["route"]` or `["requestPath"]` for the per-page split; `dataset:
  "events"` with `by: ["eventName"]` or `["eventData/<property>"]` for custom events. Production
  only for counts since enablement; previews and staging are separated by the `environment`
  dimension.

## Verifying a change

On a preview deployment for the exact commit. The script is injected on mount, so it is not in
the server HTML, and it exits early when `navigator.webdriver` is true — an automated browser
must mask that (`Object.defineProperty(navigator, 'webdriver', { get: () => false })` before
any page script) or no beacon is ever sent.

1. `window.va` is a function and `window.vam` is `production`; the `/<hash>/script.js` request
   returns 200.
2. Each full or client-side navigation sends `POST /<hash>/view` whose body field `o` is the
   page URL and `dp` the route pattern (`/artist/[id]`).
3. Each client custom event sends `POST /<hash>/event` with `en` = the event name and `ed` =
   its properties; server events arrive at `/_vercel/insights/event` from the function and show
   in the dashboard's Events tab, not in the browser's network log.
4. No console errors from the script; both viewports, both themes.

The dashboard shows data for production within a day of the release; the MCP query above should
return non-zero rows for `route`.
