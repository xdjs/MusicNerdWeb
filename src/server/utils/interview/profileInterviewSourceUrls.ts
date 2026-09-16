import { latestExternalUrl } from '@/lib/artist/artistLatest';
import { getVaultSourcesByArtistId } from '@/server/utils/queries/dashboardQueries';

/** Recover public references independently of Latest's moving page of results. */
export async function profileInterviewSourceUrls(artistId: string, keys: string[]): Promise<Map<string, string>> {
    const found = new Map<string, string>();
    for (const key of keys) {
        if (!key.startsWith('profile_recent_')) continue;
        const url = latestExternalUrl(Buffer.from(key.slice('profile_recent_'.length), 'base64url').toString('utf8'));
        if (url) found.set(key, url);
    }
    const loreKeys = new Set(keys.filter(key => key.startsWith('profile_lore_')));
    if (loreKeys.size) {
        const sources = await getVaultSourcesByArtistId(artistId, 'approved').catch(() => []);
        for (const source of sources) {
            const key = `profile_lore_${source.id}`;
            if (!loreKeys.has(key) || source.status !== 'approved' || source.filePath) continue;
            const url = latestExternalUrl(source.url);
            if (url) found.set(key, url);
        }
    }
    return found;
}
