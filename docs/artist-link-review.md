# Artist link review

Approved by Pete on 2026-10-08; tracked in #1468. This replaces the source manager previously embedded beneath Links with an artist review surface in Edit profile → Lore.

## Artist experience

Suggested links presents pending ordinary link contributions and source-backed artist destinations. Each entry shows its URL, recorded contributor display name, submission date and time, and Add to Links / Dismiss. Approved or dismissed entries retain their contributor and show the reviewer and server-recorded review date/time. Browser-local timestamps include a timezone; missing historical attribution is explicitly unknown, never inferred from approval or source content.

Approved destinations appear as platform icons. Apple Music and Beatport artist URLs are supported through the normal submission path; albums/tracks cannot become artist Links. A different existing account is not silently replaced. Artist source details remain in Lore. Removing a source-backed icon preserves its evidence and original attribution.

## Boundaries

Only the claimed artist or an admin can read or decide the artist's suggestions. The server rechecks current ownership and pending state within the mutation. Requests cannot supply contributor/reviewer identity or timestamps. Existing admin review remains available. Anonymous visitors cannot access pending submissions. Reads do not scrape or generate content.

The private route `/api/artist/[id]/link-suggestions` lists a bounded set of pending and recent reviewed items, with an offset and a Load more control. Decisions use the original record kind and ID. Both the submitted record and the activity log remain the source of truth. No synthetic preview contributor or clock string ships.

## Verification

Verify authorization and ownership changes, same-record concurrent decisions, original contributor retention, real timestamps, duplicate/conflicting artist accounts, release rejection, persistent approve/dismiss/reload, and icon removal with retained evidence. Exercise the real signed-in preview in light/dark and desktop/phone layouts before release. A local prototype is design evidence only.
