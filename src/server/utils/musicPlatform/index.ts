export type { MusicPlatform, MusicPlatformArtist, MusicPlatformProvider } from './types';
export { SpotifyProvider, spotifyProvider } from './spotifyProvider';
export { DeezerProvider, deezerProvider } from './deezerProvider';
export { ArtistMusicPlatformDataProvider } from './artistMusicPlatformDataProvider';

import { DeezerProvider } from './deezerProvider';
import { SpotifyProvider } from './spotifyProvider';
import { ArtistMusicPlatformDataProvider } from './artistMusicPlatformDataProvider';

export const musicPlatformData = new ArtistMusicPlatformDataProvider(
    new DeezerProvider(),
    new SpotifyProvider(),
);
