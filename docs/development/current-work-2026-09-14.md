# Current work — September 14, 2026

This is the backlog consolidation receipt, not a second live tracker. GitHub issues own status.
Pete approved the local review and requested PR preparation. The changes below await PR review
and merge; this receipt does not mark them as shipped.

## Current priorities

| Issue | Work | Status at this review |
|---|---|---|
| [#1255](https://github.com/xdjs/MusicNerdWeb/issues/1255) | Fixed Lore explanation and login/account pink | Local visual review approved; PR preparation authorized, not merged |
| [#1256](https://github.com/xdjs/MusicNerdWeb/issues/1256) | Existing artist shown as external-only for partial search | Compatibility fix prepared for PR; real PostgreSQL fixture and focused tests passed |
| [#1257](https://github.com/xdjs/MusicNerdWeb/issues/1257) | Backlog consolidation and issue-linked agent work | 21 legacy issues closed with retained history; archive and canonical rule prepared for PR |
| [#1258](https://github.com/xdjs/MusicNerdWeb/issues/1258) | Analytics and campaign tracking | Sweetman’s standup proposal; implementation not verified |
| [#1259](https://github.com/xdjs/MusicNerdWeb/issues/1259) | AI Gateway evaluation for About and Ask | Team agreed to explore; model selection remains open |
| [#1265](https://github.com/xdjs/MusicNerdWeb/issues/1265) | Research flow review and worker reliability | Pete + Sweetman discussion; carries older operational investigations |
| [#1238](https://github.com/xdjs/MusicNerdWeb/issues/1238) | Streaming destinations for Latest releases | Existing tracker retained |
| [#1246](https://github.com/xdjs/MusicNerdWeb/issues/1246) | Sleevenote unresolved artist lookups into research | Existing tracker retained |
| [#1247](https://github.com/xdjs/MusicNerdWeb/issues/1247) | Zero-contribution leaderboard entries | Retained; explicitly low priority in standup |
| [#1261](https://github.com/xdjs/MusicNerdWeb/issues/1261) | Preview/staging database pool exhaustion | Extracted from #1228; not yet remediated |

## Useful legacy work retained in focused issues

- [#1260](https://github.com/xdjs/MusicNerdWeb/issues/1260): claim transition/concurrency safety and cost-bearing action throttles.
- [#1262](https://github.com/xdjs/MusicNerdWeb/issues/1262): admin role changes by user ID, including email-only users.
- [#1263](https://github.com/xdjs/MusicNerdWeb/issues/1263): real-account authentication and session reliability.
- [#1264](https://github.com/xdjs/MusicNerdWeb/issues/1264): link submission loading/error handling and validation.
- [#1270](https://github.com/xdjs/MusicNerdWeb/issues/1270): remaining page regression coverage from #978; low priority, scheduled separately from this release.
- [#1160](https://github.com/xdjs/MusicNerdWeb/issues/1160): platform-ID audit, now including legacy YouTube handles.

[The archive](backlog-archive-2026-09-14.md) preserves original pre-June issue descriptions,
creation dates, reasons and replacement links. Archived does not mean fixed.
Post-May migration/RLS, CI, upload verification and contribution-credit issues remain open;
the cutoff does not authorize silently discarding those unresolved tasks.

## Release follow-up

[#1251](https://github.com/xdjs/MusicNerdWeb/pull/1251) merged to main with
[#1252](https://github.com/xdjs/MusicNerdWeb/pull/1252), placing moments inside Latest.
[#1228](https://github.com/xdjs/MusicNerdWeb/issues/1228) is closed and records the production
receipt for that release; its shipped scope no longer requires a separate verification task here.
[#1253](https://github.com/xdjs/MusicNerdWeb/pull/1253) (library folders) and
[#1254](https://github.com/xdjs/MusicNerdWeb/pull/1254) (today’s transcript) merged to staging
after #1251 and await a subsequent release. Database pool reliability is tracked in #1261.
Embeds, collecting/minting and media pinning remain deferred.

## Search evidence

Read-only production searches show external Deezer ID 94933462 for `pete ra`, while the exact
name and `peterango` return the existing production profile with that same Deezer ID. Legacy
compact `lcname` storage makes the spaced partial query miss the record. The local fix matches
both formats before ranking/limiting. No artist merge, deletion, backfill, or production write
was performed; this is not an exhaustive database duplicate audit.
