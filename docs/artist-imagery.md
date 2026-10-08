# Artist imagery

Artist portraits use the artist's saved `customImage` first, whether uploaded or
explicitly selected from a provider through Change photo. Without a saved selection,
use Spotify's artist image, then Deezer if Spotify is unavailable. The pink default
avatar is last. Pete restored this preference on October 8, 2026, superseding #1378's
Deezer-first automatic choice;
see [photo choices and preservation requirements](artist-photo-choice.md) for #1378.

This ordering applies to the artist page hero, Open Graph and Twitter preview, and
shared artist thumbnails. `getArtistPortrait` uses Deezer's large image when Spotify has no usable photo;
thumbnail contexts use `getArtistImage`. Non-image artist data
also keeps Deezer as the primary provider through `musicPlatformData.getArtist`.

Spotify image lookup tries its authenticated Web API and then its public oEmbed
thumbnail. Those are the preferred sources for automatic imagery, or explicit choices
in the photo chooser. Adding a Spotify link can replace an automatic Deezer photo,
but never a saved image. Selecting a provider photo saves that particular URL only
after an authorized user confirms it; previewing or cancelling does not change it.

Existing saved photos, including Pete Rango's and Dutchyyy's, retain priority.
The earlier Deezer-first release pinned Bike Lane's Spotify portrait through
[release SQL](../scripts/release/preserve-bike-lane-portrait.sql). No new image writes
or crop resets are required for the October 8 preference change.
