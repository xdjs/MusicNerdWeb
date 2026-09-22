# Contribution-based profile artists

September 22, 2026 — #1325 supersedes the bookmark-driven collection in #1274.
Pete and Carl's September 21 standup decision (09:04–13:12), reconfirmed by Pete,
removes bookmarks for now. Your artists and Your artists lately reflect artists
the signed-in user added or helped with an approved contribution or recorded self-edit.
Pending/unapproved submissions alone do not qualify. An artist appears once even
when several contribution types or repeated edits qualify them.

Both sections use one account-scoped artist query. Names sort alphabetically with
artist ID as a stable tie-breaker. The collection is searched on the server and
loaded in 24-artist pages; the updates endpoint retains six-artist windows, two
concurrent provider reads, two items per artist after filtering, and explicit
partial-coverage copy. Display order is not a new contribution ranking.

No bookmark imports, writes, toggles, suggestions, or bookmark-specific search
presentation run in the current UI. Stored bookmarks and their underlying API
remain intact for potential future use. No migration or credit-rule change is needed.
The collection is derived at read time, so new approved contributions appear on
refresh; pending and empty accounts never receive sample artists. Account headers,
private/no-store responses, account-scoped query keys and cancellation isolate users.

The design preview uses explicitly labeled contribution fixtures, never browser
bookmarks. Spotify listening-history integration and reintroducing bookmarks are
separate future decisions. Existing legacy Dashboard code is not the active profile.

Collection search waits for a 300 ms pause in typing before requesting the server. Stored portrait values are normalized to local paths or credential-free HTTPS URLs; invalid values and placeholders fall back to the existing artist image resolver.
