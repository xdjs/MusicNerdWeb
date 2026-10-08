# Social research and interview context

MusicNerdAPI owns collection and caption extraction. Its durable `social_ingest` job reads connected Instagram, TikTok and X profiles and enriches a capped selection of short Instagram reels with sparse captions. The implementation contract is [MusicNerdAPI social research](https://github.com/xdjs/MusicNerdAPI/blob/codex/social-research-scrapers/SOCIAL_RESEARCH.md), tracked in [#1414](https://github.com/xdjs/MusicNerdWeb/issues/1414).

| Consumer | Evidence used |
| --- | --- |
| Interview and returning interview | Stored captions, verified caption credits/statements, profile/Lore sources, and separately labelled reel audio candidates |
| Lore | The same caption extraction plus bounded reel audio context with original post citations |
| About, Ask Artist and fun facts | Compiled Lore; they do not start new scrapes |
| Research refresh | Existing queued API jobs; newly collected sources become available to all of these readers |

The website still owns the active interview question generator. It reads only provenance-marked transcripts; arbitrary provider transcript fields are ignored. Audio is offered as a discussion topic from a shared reel, with speaker identity unverified. It must not become a first-person artist statement, lyric attribution or collaborator credit. The existing question verifier checks the premise against the supplied audio context and requires a content-specific follow-up.

Question keys and resumed citations retain the original source URL. TikTok/X keys use their complete platform post id, preventing long profile URLs from collapsing into one key. Historical Instagram keys remain unchanged. Engagement standouts compare medians within each platform; TikTok views and X likes do not define an Instagram baseline.

The question cache includes a stored-research revision, so new posts, extracted credits and newly attached reel audio invalidate stale drafts even when collection finished in the separate API process. New audio on an old post counts as newly learned historical material for a returning interview. Saved offers and answers retain their existing sitting and offer timestamps.

This adds research context, not TikTok/X Latest cards or controls. No scrape or model generation is introduced by reading an artist page.

Interview drafting uses a 1,024-token thinking budget on the same model, keeping the existing 30-second deadline and premise verifier. An exact-preview check found unbounded default thinking timing out even on one audio signal; verification must still observe a useful audio question before treating this as a proven latency fix.
