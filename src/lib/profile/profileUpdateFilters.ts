/** User-profile groupings. Original card kinds and source labels stay intact. */
export const PROFILE_UPDATE_FILTERS = [
  {id: 'All', label: 'All'},
  {id: 'Release', label: 'Releases'},
  {id: 'Socials', label: 'Socials'},
  {id: 'Lore', label: 'Lore'},
];

/** Legacy filter ids remain supported for clients open before an update. */
export const PROFILE_UPDATE_KINDS: Record<string, readonly string[]> = {
  All: ['release', 'instagram', 'moment', 'interview'],
  Release: ['release'],
  Socials: ['instagram', 'moment'],
  Lore: ['interview'],
  Instagram: ['instagram'],
  Interview: ['interview'],
  'In-Process': ['moment'],
};
