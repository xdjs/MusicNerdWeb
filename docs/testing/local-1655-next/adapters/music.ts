import type { MusicPlatformProvider } from "@/server/utils/musicPlatform/types";
import type { ArtistMusicPlatformDataProvider } from "@/server/utils/musicPlatform/artistMusicPlatformDataProvider";
export type * from "@/server/utils/musicPlatform/types";
export type { ReciprocalArtistIdentity } from "@/server/utils/musicPlatform/crossPlatformArtistResolver";
export const musicPlatformData = {
  getArtistPortrait: async () => null,
  getArtistImage: async () => null,
  getArtist: async () => null,
  getArtistImages: async () => new Map(),
} as unknown as ArtistMusicPlatformDataProvider;
export const spotifyProvider: MusicPlatformProvider = {
  platform: "spotify",
  getArtist: async () => null,
  getArtistIdentity: async () => null,
  getArtistImage: async () => null,
  getTopTrackName: async () => null,
  searchArtists: async () => [],
  getArtists: async () => [],
};
export const deezerProvider: MusicPlatformProvider = {
  ...spotifyProvider,
  platform: "deezer",
};
export const findReciprocalArtistIdentity: typeof import("@/server/utils/musicPlatform/crossPlatformArtistResolver").findReciprocalArtistIdentity =
  async () => null;
