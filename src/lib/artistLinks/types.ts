export type ArtistLinkEditBody = {
  artistId: string;
  action?: 'set' | 'clear';
  url?: string;
  siteName?: string;
  /** Omitted for noncatalog edits; null explicitly means the displayed slot was empty. */
  expectedValue?: string | null;
};

/** How suggesting a link resolved; `siteName` is the platform's display name. */
export type AddArtistDataResp = {
  status: 'success' | 'error';
  message: string;
  siteName?: string;
};
