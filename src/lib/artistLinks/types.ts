export type ArtistLinkEditBody = {
  artistId: string;
  action?: 'set' | 'clear';
  url?: string;
  siteName?: string;
  /** Omitted for noncatalog edits; null explicitly means the displayed slot was empty. */
  expectedValue?: string | null;
};
