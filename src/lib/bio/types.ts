/** Only these fields may leave the private directory preparation store. */
export type PublicArtistAbout = {
    bio: string;
    kind: 'official' | 'researched';
    sources: { id: string; url: string; label: string }[];
};
