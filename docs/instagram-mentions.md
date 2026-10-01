# Instagram mention links

Instagram captions in Latest link literal `@username` mentions to the corresponding
`https://www.instagram.com/username/` profile in a new tab. The same links appear in
expanded posts. Card opening and mention navigation are separate controls; anchors
must never be nested inside the card button. Caption wording and punctuation remain intact.
Other kinds of Latest updates retain their existing behavior.
The clamped card preview offers direct pointer links. Keyboard users open the full post,
where every mention is in the tab order; clipped preview text never receives hidden focus.
Closing the expanded post returns focus to its card.

Ask links literal handles only when they occur in Instagram source text actually cited
by that answer. Recent captions and stored caption-credit/statement evidence provide
the allowed handles. The AI-compiled document, an uncited post, or an unrelated web
source cannot establish an Instagram destination. Existing supported links on artist
names, record titles and source citations remain available. Literal Instagram mentions
open Instagram even if that handle also belongs to an artist in Music Nerd.

A shared deterministic parser recognizes complete handles of 1–30 ASCII letters,
digits, underscores and separating periods. It preserves displayed case, punctuation
and repeated occurrences. Email addresses, handles embedded in URLs, malformed/overlong
tokens and handles inside HTML tags, attributes or comments remain text. HTML is always
escaped; mentions in ordinary text outside markup can still link. URLs use a fixed HTTPS
Instagram origin; model-generated URLs and HTML are never used to build these links. A source-backed handle is evidence
of the mention, not a check that the account still exists or retains that username.

The data path is stored Instagram caption → parser → React text/anchors. Ask keeps a
server-only mapping from numbered Instagram sources to their evidence text, filters it
to the sources cited in the answer, and returns only supported mention destinations.
No new tables, migrations, model calls, profile lookups or scrape requests are required.
Already saved posts gain links when this code is released; normal future ingestion
uses the same display path.

Pete authorized checking Pete Rango, LATASHÁ and Dutchyyy and refreshing Instagram only
if data needed for these links is missing. The audit and any bounded data refresh are
recorded on the owning issue. Profile photos, biographies, names and claims are outside
this change. Page reads and Ask requests remain free of ingestion side effects.

Verification covers handle boundaries, punctuation and unsafe input; cited versus
uncited/non-Instagram evidence; the actual Ask route/renderer; card and dialog links;
unchanged non-Instagram cards; keyboard navigation and the three artists’ stored posts.
