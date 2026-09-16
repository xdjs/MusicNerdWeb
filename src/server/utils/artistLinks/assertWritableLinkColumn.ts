const WRITABLE_LINK_COLUMNS = new Set([
  "bandcamp", "deezer", "facebook", "x", "soundcloud", "patreon", "instagram",
  "youtube", "youtubechannel", "spotify", "twitch", "imdb", "musicbrainz",
  "wikidata", "mixcloud", "facebookID", "discogs", "tiktok", "tiktokID",
  "jaxsta", "famousbirthdays", "songexploder", "colorsxstudios", "bandsintown",
  "linktree", "onlyfans", "wikipedia", "audius", "zora", "catalog", "opensea",
  "foundation", "lastfm", "linkedin", "soundxyz", "mirror", "glassnode",
  "spotifyusername", "bandcampfan", "tellie", "lens", "cameo", "farcaster",
  "supercollector", "ens", "subvert", "bluesky", "inprocess",
]);

export function assertWritableLinkColumn(columnName: string): void {
  if (!columnName) {
    throw new Error("Invalid column name");
  }
  if (columnName === "wallets" || columnName === "wallet") {
    throw new Error("Wallets must be managed through dedicated array operations");
  }
  if (!WRITABLE_LINK_COLUMNS.has(columnName)) {
    throw new Error(`Column not in writable whitelist: ${columnName}`);
  }
}

