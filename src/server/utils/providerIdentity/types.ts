/** Exact values observed when an automatic Deezer candidate was corroborated. */
export type DeezerWriteEvidence = {
  spotifyId: string;
  deezerId: string;
  previousDeezerId: string | null;
};

/** Exact values observed when an automatic Spotify candidate was corroborated. */
export type SpotifyWriteEvidence = {
  spotifyId: string;
  deezerId: string;
  previousSpotifyId: string | null;
};
export type CatalogWriteEvidence = DeezerWriteEvidence | SpotifyWriteEvidence;
