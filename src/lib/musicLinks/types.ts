export type MusicDestination = {
  platform: string;
  label: string;
  kind: 'artist' | 'release';
  id: string;
  /** Preserve the supplied URL, including meaningful release/track query parameters. */
  url: string;
  support: boolean;
};
