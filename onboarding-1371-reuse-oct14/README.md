## 2026-10-14 final discovery-reuse acceptance (staging only)

Exact pair: Web `0bb828285ef43d0338ad3622f8e4b10981ba39b4` / API `c70b4edd487fa89c7c841b04baa77ce37f17778d`. Notification credentials disabled only on these deployments; intended session pool used. No production data changed by this verification.

Normal search showed Green-House already present; no existing artist was changed. Created provider-only Lizzie Berchie through normal Add: `967a754c-66ba-4e5e-86de-62026e621e0b`.

- 23:33 UTC: one directory source-search job `8391b480-fe53-4cb1-aaa5-746a77cc3d76` completed in14.2s, stored version1 immutable completion checkpoint and14pending sources. One request had5Tavily searches. Links populated (Spotify, Deezer, social profiles, Bandcamp); releases were visible. About absent, public Lore empty.
- Started the one queued Instagram ingest before claim. Claim submitted and approved through normal UI. Claim `5a29edd5-aeae-4a88-ae79-c3748a87ac37`.
- Approval did not enqueue a second source_search; all14sources remainedpending, bioNULL.
- Authenticated onboarding open at23:34:52 and confirmprofiles at23:35:16 both returned200. Savedprofiles appeared immediately, then existing14source review. Scoped request logs contain no profileDiscovery/vaultWebSearch/websearch calls after original discovery. The original source-search ID and checkpoint remain unchanged.
- Claim-scoped social replacement `f6e7fa7b-d7ab-47e9-9167-85dfae98282b` preserved the already-started Apify run ID. Logs show storedposts/thumbnails through9; later TikTokread remainedpending at observation. This proves resume rather than full social completion.
- Anonymous profile200 retains platform links, excludes pending source URL and onboarding controls. Anonymous About endpoint returns only its existing insufficient-information placeholder, no prepared narrative.
- Did not rerun interview or generation. Prior Dylan explicit source review/edit/publish proof remains applicable to unchanged later steps.

### Final saved-card verification

Final presentation pair: Web `23ecd44f388acf93b5816e6e8229318be95e70cb` / API `eb5dcc60b076ae1f26e143e42d8d95821ba067fe`. Integration heads `7244a22f` / `8cf941d8` have byte-identical trees to these tested heads. Subsequent Web integration with #1515 is a separate remaining gate.

Deezer now links to its canonical artist URL. The saved YouTube channel appears with the correct channel URL and retains its `youtubechannel` removal key. The missing-platform hint no longer incorrectly lists YouTube. Verified at 832px and 390px, dark and light.

Controlled presentation recheck: snapshotted and removed only this isolated fixture's `profiles` confirmation row, leaving claims, sources, jobs and checkpoint unchanged. Reopened the corrected card, then reconfirmed normally and reached the existing source review again. This controlled reset is separate from the original organic add/claim acceptance above.

Final read at 23:48 UTC: original single source_search ID unchanged; all 14 sources still pending; public bio remains NULL. Social replacement finished with nine Instagram posts visible; downstream caption/Lore jobs completed without public bio publication. No new fixture or paid discovery was created for the card fix.

One theme-navigation reload produced a generic opening error; explicit Retry recovered the saved card. This was not an authentication error. The existing partial Latest provider warning remains visible. Neither is represented as a clean interview/full-provider acceptance.

Later explicit single-source approval/rejection and publication are covered by the [prior Dylan verification](https://github.com/xdjs/MusicNerdWeb/issues/1371#issuecomment-6180413789); no interview/generation rerun was performed here.

Validation: Web 448 suites / 4,222 passing tests, six existing skips; API 550 files / 2,547 passing tests. Types, lint and builds passed in both repositories.

![fixed-832-dark](https://raw.githubusercontent.com/xdjs/MusicNerdWeb/sweetmantech/pr-screenshots/onboarding-1371-reuse-oct14/fixed-832-dark.jpg)

![fixed-390-dark](https://raw.githubusercontent.com/xdjs/MusicNerdWeb/sweetmantech/pr-screenshots/onboarding-1371-reuse-oct14/fixed-390-dark.jpg)

![fixed-832-light](https://raw.githubusercontent.com/xdjs/MusicNerdWeb/sweetmantech/pr-screenshots/onboarding-1371-reuse-oct14/fixed-832-light.jpg)

![fixed-390-light](https://raw.githubusercontent.com/xdjs/MusicNerdWeb/sweetmantech/pr-screenshots/onboarding-1371-reuse-oct14/fixed-390-light.jpg)

