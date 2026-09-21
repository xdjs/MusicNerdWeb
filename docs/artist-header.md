# Artist header

September 21, 2026 — issue #1307, local implementation; not released.

The current portrait header applies whenever the page has an artist photo, whether
from the existing music-platform lookup or an artist upload. Uploaded photos retain
precedence. Only an artist without either photo uses the centered placeholder header.
The fallback About block has automatic horizontal margins so both its text and
expansion control are centered within the header at desktop widths.

Confirmed cause: the page previously passed `hasPortrait` only for `customImage`,
while HeroSection switched that state on after a successful upload. This explains
why a provider photo used a different layout before uploading. The fallback About
had a max-width but no centering margins; this is not a Safari-specific rule.
The original Safari session and a paired after-upload screenshot remain unavailable.

This changes rendering only. Provider selection, image upload, authorization,
storage and cache invalidation are unchanged. Photo-backed About text remains
left-aligned within the approved portrait layout; placeholder About is centered.
