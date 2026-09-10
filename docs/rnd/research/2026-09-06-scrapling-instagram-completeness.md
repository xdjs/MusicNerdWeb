# Scrapling Instagram completeness test

Tested locally on 2026-09-06 with Scrapling 0.4.15, Python 3.14.5, and installed Chrome in fresh headless sessions. No Instagram login, user cookies, paid proxies, database writes, or new Apify run. This measures anonymous access from one local connection, not production reliability.

## Finding

Scrapling recovered every known post in our 32-post reference sample, but profile browsing did not discover a complete history. Both tested profiles stopped growing at 36 posts and displayed repeated signup/login prompts despite pagination metadata indicating more pages existed. Use it as a candidate for known-post retrieval and shallow discovery; this test does not justify replacing deep Instagram ingestion.

## Reference and method

The reference is `src/server/utils/__fixtures__/socialPosts.fixture.ts`: 32 curated posts from an earlier Apify run, dated June 2018 through August 2026. It includes foreign-owned collaboration posts and 14 posts with recorded music titles. The original full `/tmp/ig-deep.json` capture is no longer available. This is a historical comparison, not a simultaneous vendor benchmark or a random sample of Instagram.

For each URL, Scrapling fetched the public page using Chrome HTTP impersonation. A small custom parser read embedded JSON and selected the requested post code; unrelated suggested posts were excluded. All 32 target records arrived through HTTP, so missing-target browser fallback was unnecessary. Additional stealth-browser checks examine the music-bearing reference posts and page-initiated GraphQL responses.

Separately, fresh stealth-browser sessions visited `p3t3rango` and `pharaohsistare`, dismissed closable signup dialogs, scrolled, clicked the visible Show More control, and continued scrolling until four consecutive attempts yielded no new posts. An initial attempt could not click through a signup overlay; the corrected test dismissed it first.

## Known-post completeness

| Field | Result |
| --- | --- |
| Requested post recovered | 32/32 |
| Post ID and timestamp match | 32/32 each |
| Nonempty caption matches exactly | 31/31 |
| Empty caption | One reference empty string returned as null; equivalent after normalization |
| Owning username matches historical reference | 30/32 |
| Own-versus-foreign post classification matches | 32/32 |
| Coauthor list matches after excluding the subject artist, as our mapper does | 31/32 |
| Image candidate URLs present | 32/32; downloads and retention not tested |
| Structured music payload present through HTTP | 0/14 posts with reference music titles |
| Structured music payload recovered by stealth-browser follow-up | 0/14; all 14 requested posts themselves loaded |

The browser follow-up also found no audio links on these 14 pages. Captured background responses included `Unauthorized logged out query.` errors despite HTTP 200 responses. That establishes incomplete anonymous responses, but does not prove which denied query would have supplied music metadata. One expected title, “rush,” occurred in the caption; this is not a recovered platform audio credit. HTTP success and keyword presence must not be counted as metadata completeness.

HTTP fetch and extraction took a median 0.655 seconds per post, with a 0.4–1.96 second range. Requests were spaced by an additional second. These timings exclude installation and browser music checks.

Two owner mismatches show `jordanrein_` where the reference says `rein.rocks`. One coauthor mismatch shows `deunnahendrix` where the reference says `soothebyhendrix`. These may be handle changes, but the historical fixture lacks stable user IDs to prove that. They must not be described as either verified renames or confirmed extraction errors.

## Discovery completeness

Both profiles progressed from 12 to 24 to 36 distinct post codes. Further attempts produced signup/login dialogs and no additional posts, while the captured feed pagination still had `has_next_page: true`. Thus 36 is the observed limit of this anonymous browser flow, not a universal Scrapling or Instagram limit.

The 36 posts discovered from Pete's profile included only 12 of the 32 reference URLs (37.5% of this deliberately mixed-age sample). Direct requests recovered all 32. This distinguishes being able to read an old post from being able to find it from the profile.

No percentage of an entire account history is claimed: the fixture is incomplete, profile counters differ across surfaces, and archived/deleted/private content is not established ground truth. Pharaoh's profile was tested for pagination, but the 32-post field comparison concerns Pete's saved fixture.

## Limits and next decision

Known URLs and caption research are promising. Complete-history discovery and music-credit parity remain unproven. A production integration would need identity normalization, code-specific extraction, schema validation, and a strategy for authenticated or provider-backed deep ingestion. The parser is custom code; Scrapling is not providing a ready-made normalized Instagram dataset.

Comments, complete carousel contents, video downloads, engagement accuracy, tagged-user parity, cross-platform coverage, authenticated access, cloud IP behavior, and sustained rate-limit behavior were not validated. No application behavior changed.

Scripts and raw evidence are temporary at `/tmp/musicnerd-scrapling-test-20260906/`: `completeness.py`, `fixture.json`, and `completeness/` with per-post captures, `individuals.json`, profile results, and music checks. Raw material includes public comments and signed image URLs and stays outside tracked documentation. This note is the durable aggregate record; no PR, push, or deployment was performed.
