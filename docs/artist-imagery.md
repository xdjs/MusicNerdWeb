# Artist imagery

Artist portraits use the artist's saved `customImage` first, whether uploaded or
explicitly selected from a provider through Change photo. Without a saved selection,
use Deezer's artist image, then Spotify if Deezer is unavailable. The pink default
avatar is last. This supersedes the automatic Spotify preference introduced by #1352;
see [photo choices and preservation requirements](artist-photo-choice.md) for #1378.

This ordering applies to the artist page hero, Open Graph and Twitter preview, and
shared artist thumbnails. `getArtistPortrait` uses Deezer's large image for the hero
and social preview; thumbnail contexts use `getArtistImage`. Non-image artist data
also keeps Deezer as the primary provider through `musicPlatformData.getArtist`.

Spotify image lookup tries its authenticated Web API and then its public oEmbed
thumbnail. Those are fallback sources for automatic imagery, or explicit choices
in the photo chooser. Adding a Spotify link does not replace a saved image or a usable
automatic Deezer photo. Selecting a provider photo saves that particular URL only
after an authorized user confirms it; previewing or cancelling does not change it.

Existing saved photos, including Pete Rango's and Dutchyyy's, retain priority.
Before the default changes reach production, preserve Bike Lane's existing Spotify
portrait with the non-overwriting [release SQL](../scripts/release/preserve-bike-lane-portrait.sql).
Preserve existing crop positions and verify all three profiles before and after release.
