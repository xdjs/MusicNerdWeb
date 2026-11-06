# Missing-artist contact requests (#1619; follow-up to #1312)

The October 22 R&D selected the existing info alias for artist submissions (the
[public transcript](rnd/transcripts/2026-10-22-rnd-08f8acb45619.md), line 63, redacts
the address). The [original shared meeting notes](https://notes.granola.ai/t/08f8acb4-5619-4b2d-ba1a-a89231bb6c5e)
independently confirm the exact destination Pete supplied for this implementation.
This supersedes the September 21 recipient choice; mailbox delivery is not verified
by preparing or copying a draft.

The existing signed-in Add Artist dialog offers “Can’t find your artist?” below
the Spotify/Deezer form. Use it when the catalog lookup cannot find the artist,
including artists who do not release on either provider. Expanding it collects an
optional artist name and public music/profile links, then opens a prefilled email
for the user to review and send. The destination is visible; copy and manual-copy
fallbacks support users without a configured mail app or clipboard access.

This requests team review. It does not create a profile, guarantee inclusion,
verify ownership, submit Lore, write to the database or loosen DSP validation.
There is no app submission endpoint, new inbox, queue, ingestion job or email
infrastructure change. The existing search/add paths and authentication stay intact.
