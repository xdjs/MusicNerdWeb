# Terms and Privacy pages

> Feature contract for [#1453](https://github.com/xdjs/MusicNerdWeb/issues/1453). Release status
> lives on the issue's PR matrix, not here.

## What exists

| Route | Page | Source |
| --- | --- | --- |
| `/terms` | Terms of Service | `src/app/terms/page.tsx` |
| `/privacy` | Privacy Policy | `src/app/privacy/page.tsx` |

Both are static server components with no data reads, rendered through the shared
`src/app/_components/legal/LegalPage.tsx` (title, effective date, body). Both are listed in the
first sitemap chunk (`src/app/sitemap.ts`) and are indexable. The operator named on both pages
is xDJs; the contact for questions and data requests is `dev@xdjs.com`.

## The effective date

One date covers both pages: `LEGAL_EFFECTIVE_DATE` in `src/lib/legal/constants.ts` (ISO
`YYYY-MM-DD`), shown as "Effective October 8, 2026" by `formatEffectiveDate`. When either page's
copy changes in substance, change the date in the same PR. The date is formatted in UTC, so it
reads the same in every visitor's timezone.

## What the Privacy Policy describes

The copy must match what the code does. Update the page in the same PR as any change to:

- **Account data:** the `users` row (email, username, Privy user id, optional wallet address),
  created at sign-in through Privy and kept in the session by NextAuth.
- **Contributions:** link and Lore submissions (`ugcresearch`), artist claims, interview and
  question answers, bookmarks and self-edits. These are attributed publicly to the username.
- **Artist data from public sources:** profiles, posts and pages gathered by the research jobs
  in MusicNerdAPI (Tavily web search, Apify for public Instagram posts, Spotify and Deezer
  catalogue data) and summarised with AI models through Vercel AI Gateway.
- **Analytics:** Vercel Web Analytics, cookieless, as in [analytics.md](analytics.md).
- **Browser storage:** the session cookie, Privy's sign-in storage and the `musicnerd-theme`
  preference. No advertising or cross-site tracking.
- **Processors:** Vercel, Supabase, Privy, Resend, and the AI and data providers above.
- **API access:** tokens from `/access` are the user's Privy session, as in the API docs.

## Approval

The copy is a draft until Pete and the reviewer he names approve it on the PR. Linking the
pages from the footer and the About page is [#1452](https://github.com/xdjs/MusicNerdWeb/issues/1452),
after the approved pages reach production.
