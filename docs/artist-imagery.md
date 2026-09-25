# Artist imagery

Artist portraits use the artist's own uploaded `customImage` first. When an artist has a Spotify ID, use Spotify's artist image next; if it is unavailable, use Deezer's image. The pink default avatar is last.

This ordering applies to the artist page hero, Open Graph and Twitter preview, and shared artist thumbnails. The profile hero and social preview use `getArtistPortrait`, which retains Deezer's large image when Spotify has no photo. Thumbnail contexts use `getArtistImage`. `musicPlatformData.getArtist` still uses Deezer as the primary provider for non-image data. Adding a Spotify artist URL saves its ID through the existing link submission path; no separate image upload or migration is required. A page refresh picks up the new provider image.

The authenticated Spotify Web API supplies the preferred image. If that lookup fails or has no image, Spotify's public oEmbed thumbnail is used before falling back to Deezer. Provider failures leave the existing fallback available. An artist-uploaded portrait is never replaced by a provider image.
