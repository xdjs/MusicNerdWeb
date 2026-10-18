/** Only these fields may leave the private directory preparation store. */
export type PublicArtistAbout = {
    bio: string;
    kind: 'official' | 'researched';
    sources: { id: string; url: string; label: string }[];
};

/** Per-account correction reports in a rolling 24-hour window. */
export const BIO_CORRECTION_REPORT_LIMIT = 10;
