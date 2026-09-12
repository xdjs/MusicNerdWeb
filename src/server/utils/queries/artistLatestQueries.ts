import { and, desc, eq, isNotNull, or, sql } from 'drizzle-orm';
import type { Artist } from '@/server/db/DbTypes';
import { db } from '@/server/db/drizzle';
import { artistInterviewAnswers, artistOnboardingSteps, artistSocialPosts } from '@/server/db/schema';
import { getLatestArtistReleases } from '@/server/utils/musicPlatform/latestReleases';
import { sourceUrlsForQuestionKeys } from '@/server/utils/questionGenerator';
import { instagramPostImage, instagramPostUrl, latestExternalUrl, orderLatestItems, type ArtistLatestItem } from '@/lib/artistLatest';

export interface ArtistLatestResult {
    items: ArtistLatestItem[];
    unavailable: boolean;
}

/** Public read only. Scraping, extraction and interview offers stay in their existing workers/actions. */
export async function getArtistLatest(artist: Artist): Promise<ArtistLatestResult> {
    const [postsResult, answersResult, releasesResult] = await Promise.allSettled([
        db.select({
            id: artistSocialPosts.id, caption: artistSocialPosts.caption, url: artistSocialPosts.url,
            postedAt: artistSocialPosts.postedAt,
            // Extract just the image fields rather than loading the full scraped payload.
            raw: sql<unknown>`jsonb_build_object('displayUrl', ${artistSocialPosts.raw}->'displayUrl', 'thumbnailSrc', ${artistSocialPosts.raw}->'thumbnailSrc', 'images', ${artistSocialPosts.raw}->'images')`,
        }).from(artistSocialPosts).where(and(
            eq(artistSocialPosts.artistId, artist.id), eq(artistSocialPosts.platform, 'instagram'),
            eq(artistSocialPosts.isOwnPost, true), isNotNull(artistSocialPosts.postedAt),
            sql`${artistSocialPosts.postedAt} <= now()`,
        )).orderBy(desc(artistSocialPosts.postedAt)).limit(9),
        db.select({
            id: artistInterviewAnswers.id, questionKey: artistInterviewAnswers.questionKey,
            question: artistInterviewAnswers.question, answer: artistInterviewAnswers.answer,
            createdAt: artistInterviewAnswers.createdAt,
        }).from(artistInterviewAnswers).where(and(
            eq(artistInterviewAnswers.artistId, artist.id),
            // Follow-ups publish on Send. Onboarding answers stay private until
            // the artist confirms Publish; evaluate both in the same DB snapshot.
            or(
                eq(artistInterviewAnswers.source, 'followup'),
                and(
                    eq(artistInterviewAnswers.source, 'onboarding'),
                    sql`EXISTS (SELECT 1 FROM ${artistOnboardingSteps}
                        WHERE ${artistOnboardingSteps.artistId} = ${artistInterviewAnswers.artistId}
                        AND ${artistOnboardingSteps.step} = 'publish')`,
                ),
            ),
            isNotNull(artistInterviewAnswers.answer), sql`length(trim(${artistInterviewAnswers.answer})) > 0`,
        )).orderBy(desc(artistInterviewAnswers.createdAt)).limit(6),
        getLatestArtistReleases(artist),
    ]);
    const items: ArtistLatestItem[] = [];
    let unavailable = false;
    for (const [index, result] of [postsResult, answersResult, releasesResult].entries()) {
        if (result.status === 'rejected') {
            unavailable = true;
            // Do not log DB errors with bound SQL/user text or credential-bearing provider requests.
            console.error('[artistLatest] Source unavailable', { artistId: artist.id, source: ['instagram', 'interview', 'releases'][index] });
        }
    }
    const posts = postsResult.status === 'fulfilled' ? postsResult.value : [];
    for (const post of posts) {
        const sourceUrl = instagramPostUrl(post.url);
        if (!sourceUrl || !post.postedAt) continue;
        items.push({ id: `instagram:${post.id}`, kind: 'instagram', title: 'From Instagram',
            text: post.caption?.trim() || 'A new moment shared on Instagram.', date: post.postedAt,
            imageUrl: instagramPostImage(post.raw), imageCaption: `Instagram post by ${artist.name ?? 'the artist'}`,
            sourceUrl, sourceLabel: 'View on Instagram' });
    }
    const answers = answersResult.status === 'fulfilled' ? answersResult.value : [];
    const sources = answers.length ? await sourceUrlsForQuestionKeys(artist.id, answers.map(a => a.questionKey)).catch(() => new Map<string, string>()) : new Map<string, string>();
    for (const answer of answers) {
        if (!answer.answer?.trim()) continue;
        const sourceUrl = instagramPostUrl(sources.get(answer.questionKey));
        const post = sourceUrl ? posts.find(p => instagramPostUrl(p.url) === sourceUrl) : undefined;
        items.push({ id: `interview:${answer.id}`, kind: 'interview', title: answer.question,
            text: answer.answer, date: answer.createdAt, imageUrl: post ? instagramPostImage(post.raw) : null,
            imageCaption: post ? `The post behind this answer` : `${artist.name ?? 'Artist'} portrait`,
            sourceUrl, sourceLabel: 'See the post behind this answer' });
    }
    if (releasesResult.status === 'fulfilled') {
        for (const release of releasesResult.value) {
            const sourceUrl = latestExternalUrl(release.url);
            if (!sourceUrl) continue;
            items.push({ id: `release:${release.platform}:${release.id}`, kind: 'release', title: release.title,
                text: `${release.kind.charAt(0).toUpperCase() + release.kind.slice(1)} by ${artist.name ?? 'this artist'}`,
                date: release.releaseDate, imageUrl: latestExternalUrl(release.imageUrl),
                imageCaption: `${release.title} artwork`, sourceUrl,
                listeningLinks: release.listeningLinks,
                sourceLabel: `Listen on ${release.platform === 'deezer' ? 'Deezer' : 'Spotify'}` });
        }
    }
    return { items: orderLatestItems(items), unavailable };
}
