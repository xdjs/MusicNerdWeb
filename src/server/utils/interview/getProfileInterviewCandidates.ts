import { getArtistById } from '@/server/utils/queries/artistQueries';
import { getArtistLatest } from '@/server/utils/queries/artistLatestQueries';
import { getVaultSourcesByArtistId } from '@/server/utils/queries/dashboardQueries';
import { latestExternalUrl } from '@/lib/artist/artistLatest';
import { INTERVIEW_RECENT_DAYS, type ProfileInterviewCandidate } from '@/lib/interview/profileInterviewTypes';

/** Reuse the profile's read paths. No scrape, extraction, or new research jobs. */
export async function getProfileInterviewCandidates(
    artistId: string, since: string | null, excludedKeys: Set<string>, excludedUrls = new Set<string>(), now = new Date(),
): Promise<ProfileInterviewCandidate[]> {
    const artist = await getArtistById(artistId).catch(() => null);
    if (!artist) return [];
    const [latest, lore] = await Promise.all([
        getArtistLatest(artist).catch(() => ({ items: [], unavailable: true })),
        getVaultSourcesByArtistId(artistId, 'approved').catch(() => []),
    ]);
    const cutoff = Math.max(Math.floor(now.getTime() / 86400_000 - INTERVIEW_RECENT_DAYS) * 86400_000, since ? Date.parse(since) || 0 : 0);
    const fresh = (value: string | null | undefined) => {
        const at = Date.parse(value ?? '');
        return at > cutoff && at <= now.getTime();
    };
    const candidates: ProfileInterviewCandidate[] = [];
    const seen = new Set(excludedUrls);
    for (const item of [...latest.items].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))) {
        if (item.kind === 'interview' || !fresh(item.date)) continue;
        const url = latestExternalUrl(item.sourceUrl);
        if (!url || seen.has(url)) continue;
        // The public URL travels in the key so resuming does not depend on a
        // moment still being in Latest's bounded, changing list. No signed URLs.
        const key = `profile_recent_${Buffer.from(url).toString('base64url')}`;
        if (excludedKeys.has(key)) continue;
        const platform = item.kind === 'moment' ? 'In Process' : item.kind === 'instagram' ? 'Instagram' : 'a music platform';
        const title = item.title.trim().slice(0, 180);
        candidates.push({
            signalId: key, key, kind: 'recent', authoredBy: 'profile source; see attribution in material',
            material: `Recent Latest item on ${platform}, shared/published ${item.date}. Title: ${title}.\n${item.text.slice(0, 4000)}\nThe sharing date is NOT proof of when the work was made. Do not infer credits, ownership, or release status beyond this text.`,
            sourceUrls: [url],
        });
        seen.add(url);
        if (candidates.length === 3) break;
    }
    let loreCount = 0;
    for (const source of [...lore].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))) {
        if (source.status !== 'approved' || !fresh(source.updatedAt || source.createdAt)) continue;
        const key = `profile_lore_${source.id}`;
        const url = source.filePath ? null : latestExternalUrl(source.url);
        if (excludedKeys.has(key) || (url && seen.has(url))) continue;
        const title = (source.title || source.fileName || 'this source').trim().slice(0, 180);
        candidates.push({
            signalId: key, key, kind: 'lore', authoredBy: 'source author; not necessarily the artist',
            material: `Newly added/updated approved Lore source: ${title}. Source publication date: ${source.publishedAt ?? 'unknown'}. Added/updated in Lore: ${source.updatedAt}.\n${(source.extractedText || source.snippet || '').slice(0, 4000)}\nThis is reference material, not necessarily the artist's words. Newly added does NOT mean newly published. Ask the artist for their perspective without attributing the author's claims to them.`,
            sourceUrls: url ? [url] : [],
        });
        if (url) seen.add(url);
        if (++loreCount === 3) break;
    }
    return candidates;
}
