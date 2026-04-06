import type { Artist } from '@/server/db/DbTypes';
import type { MusicPlatformArtist, MusicPlatformProvider } from './types';

export class ArtistMusicPlatformDataProvider {
    constructor(
        private primaryProvider: MusicPlatformProvider,
        private fallbackProvider: MusicPlatformProvider,
    ) {}

    private getPlatformId(artist: Artist): { provider: MusicPlatformProvider; id: string } | null {
        const deezer = artist.deezer?.trim() || null;
        const spotify = artist.spotify?.trim() || null;

        if (deezer) return { provider: this.primaryProvider, id: deezer };
        if (spotify) return { provider: this.fallbackProvider, id: spotify };
        return null;
    }

    async getArtist(artist: Artist): Promise<MusicPlatformArtist | null> {
        const deezer = artist.deezer?.trim() || null;
        const spotify = artist.spotify?.trim() || null;

        // Try primary (Deezer) first
        if (deezer) {
            const result = await this.primaryProvider.getArtist(deezer);
            if (result) return result;
            // Deezer failed, fall back to Spotify if available
            if (spotify) return this.fallbackProvider.getArtist(spotify);
            return null;
        }

        // No Deezer ID, try Spotify
        if (spotify) return this.fallbackProvider.getArtist(spotify);

        return null;
    }

    async getArtistImage(artist: Artist): Promise<string | null> {
        const deezer = artist.deezer?.trim() || null;
        const spotify = artist.spotify?.trim() || null;

        if (deezer) {
            const result = await this.primaryProvider.getArtistImage(deezer);
            if (result) return result;
            if (spotify) return this.fallbackProvider.getArtistImage(spotify);
            return null;
        }

        if (spotify) return this.fallbackProvider.getArtistImage(spotify);
        return null;
    }

    async getTopTrackName(artist: Artist): Promise<string | null> {
        const deezer = artist.deezer?.trim() || null;
        const spotify = artist.spotify?.trim() || null;

        if (deezer) {
            const result = await this.primaryProvider.getTopTrackName(deezer);
            if (result) return result;
            if (spotify) return this.fallbackProvider.getTopTrackName(spotify);
            return null;
        }

        if (spotify) return this.fallbackProvider.getTopTrackName(spotify);
        return null;
    }

    async searchArtists(query: string, limit: number): Promise<MusicPlatformArtist[]> {
        return this.primaryProvider.searchArtists(query, limit);
    }

    async getArtistImages(artists: Artist[]): Promise<Map<string, string>> {
        const imageMap = new Map<string, string>();

        const tasks = artists.map(async (artist) => {
            const image = await this.getArtistImage(artist);
            if (image) imageMap.set(artist.id, image);
        });

        await Promise.all(tasks);
        return imageMap;
    }

    getActivePlatform(artist: Artist): 'deezer' | 'spotify' | null {
        const resolved = this.getPlatformId(artist);
        return resolved?.provider.platform ?? null;
    }
}
