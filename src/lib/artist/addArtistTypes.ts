import type { MusicPlatform } from '@/server/utils/musicPlatform/types';

/** An artist already in the directory, offered instead of adding another. */
export type AddArtistCandidate = {
    imageUrl?: string;
    id: string;
    name: string | null;
    spotify: string | null;
    deezer: string | null;
};

export type AddArtistOptions = {
    forceCreate?: boolean;
};

type AddArtistRespCommon = {
    artistId?: string;
    message?: string;
    artistName?: string;
};

/** How adding an artist resolved, as the add-artist surfaces render it. */
export type AddArtistResp =
    | (AddArtistRespCommon & {
        status: 'success' | 'exists';
        candidates?: AddArtistCandidate[];
        platform?: MusicPlatform;
        platformId?: string;
    })
    | (AddArtistRespCommon & {
        status: 'error';
        code?: 'UNAUTHENTICATED';
        candidates?: AddArtistCandidate[];
        platform?: MusicPlatform;
        platformId?: string;
    })
    | (AddArtistRespCommon & {
        status: 'possible_duplicate';
        candidates: AddArtistCandidate[];
        platform: MusicPlatform;
        platformId: string;
        canCreateSeparate?: boolean;
    })
    | (AddArtistRespCommon & {
        status: 'conflict';
        candidates: AddArtistCandidate[];
        platform: MusicPlatform;
        platformId: string;
    });
