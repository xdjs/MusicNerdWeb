import { getArtistLatest } from '../artistLatestQueries';
import { db } from '@/server/db/drizzle';
import type { Artist } from '@/server/db/DbTypes';
import { getLatestArtistReleases } from '@/server/utils/musicPlatform/latestReleases';
import { sourceUrlsForQuestionKeys } from '@/server/utils/questionGenerator';
import { orderLatestItems, latestDateLabel, latestExternalUrl, instagramPostImage } from '@/lib/artistLatest';

jest.mock('@/server/utils/musicPlatform/latestReleases', () => ({ getLatestArtistReleases: jest.fn() }));
jest.mock('@/server/utils/questionGenerator', () => ({ sourceUrlsForQuestionKeys: jest.fn() }));
jest.mock('@/server/db/drizzle', () => ({ db: { select: jest.fn() } }));

const artist = { id: 'artist-1', name: 'Test Artist', deezer: '123', spotify: null } as Artist;
const sourceUrl = 'https://www.instagram.com/reel/ABC_def/';
const post = { id: 'post-1', caption: 'A night in the studio.', url: sourceUrl, postedAt: '2026-08-20T10:00:00Z', raw: { displayUrl: 'https://cdn.example.com/post.jpg', secret: 'never expose raw data' } };
const answer = { id: 'answer-1', questionKey: 'social_standout_ABC_def', question: 'What happened in the studio?', answer: 'We recorded the chorus.', createdAt: '2026-09-01T10:00:00Z' };

function selectResult(result: unknown[], reject = false) {
    const limit = jest.fn(() => reject ? Promise.reject(new Error('database unavailable')) : Promise.resolve(result));
    return { from: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ orderBy: jest.fn().mockReturnValue({ limit }) }) }) };
}

beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(db.select).mockImplementationOnce(() => selectResult([post]) as never).mockImplementationOnce(() => selectResult([answer]) as never);
    jest.mocked(sourceUrlsForQuestionKeys).mockResolvedValue(new Map([[answer.questionKey, sourceUrl]]));
    jest.mocked(getLatestArtistReleases).mockResolvedValue([{ id: 'album-1', title: 'New record', releaseDate: '2026-08-25', url: 'https://www.deezer.com/album/123', imageUrl: 'https://cdn.example.com/album.jpg', kind: 'single', platform: 'deezer' }]);
});

it('combines real read adapters, orders by answer chronology, and projects only public card fields', async () => {
    const result = await getArtistLatest(artist);
    expect(result.unavailable).toBe(false);
    expect(result.items.map(item => item.kind)).toEqual(['interview', 'release', 'instagram']);
    expect(result.items[0]).toMatchObject({ text: answer.answer, date: answer.createdAt, sourceUrl, imageUrl: post.raw.displayUrl });
    expect(JSON.stringify(result)).not.toContain('never expose raw data');
    expect(sourceUrlsForQuestionKeys).toHaveBeenCalledWith(artist.id, [answer.questionKey]);
    expect(getLatestArtistReleases).toHaveBeenCalledWith(artist);
});

it('retains releases when the DB is unavailable and reports partial failure', async () => {
    jest.mocked(db.select).mockReset().mockImplementation(() => selectResult([], true) as never);
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const result = await getArtistLatest(artist);
    expect(result.unavailable).toBe(true);
    expect(result.items.map(item => item.kind)).toEqual(['release']);
    expect(sourceUrlsForQuestionKeys).not.toHaveBeenCalled();
    error.mockRestore();
});

it('does not fabricate sources, keep skipped answers, or expose off-platform post links', async () => {
    jest.mocked(db.select).mockReset().mockImplementationOnce(() => selectResult([{ ...post, url: 'https://example.com/not-instagram' }]) as never)
        .mockImplementationOnce(() => selectResult([{ ...answer, answer: ' ' }, { ...answer, id: 'static', questionKey: 'sound_in_own_words' }]) as never);
    jest.mocked(sourceUrlsForQuestionKeys).mockResolvedValue(new Map());
    const result = await getArtistLatest(artist);
    expect(result.items.filter(item => item.kind === 'instagram')).toEqual([]);
    expect(result.items.filter(item => item.kind === 'interview')).toHaveLength(1);
    expect(result.items[0].sourceUrl).toBeNull();
});

it('rejects unsafe links and keeps image selection tied to stored post fields', () => {
    expect(latestExternalUrl('javascript:alert(1)')).toBeNull();
    expect(latestExternalUrl('https://user:password@example.com')).toBeNull();
    expect(instagramPostImage({ displayUrl: 'data:image/png;base64,abc', thumbnailSrc: post.raw.displayUrl })).toBe(post.raw.displayUrl);
    expect(instagramPostImage({ caption: 'https://example.com/unrelated.jpg' })).toBeNull();
});

it('keeps date precision and rejects undated/future activity with deterministic ties', () => {
    expect(latestDateLabel('2025')).toBe('2025');
    expect(latestDateLabel('2025-02')).toBe('Feb 2025');
    expect(latestDateLabel('2025-02-13')).toBe('Feb 13, 2025');
    const item = { id: 'a', kind: 'interview' as const, title: '', text: '', date: '2026-01-01', imageUrl: null, imageCaption: '', sourceUrl: null, sourceLabel: '' };
    expect(orderLatestItems([item, item, { ...item, id: 'b', date: 'invalid' }, { ...item, id: 'c', date: '2027-01-01' }], Date.parse('2026-09-01'))).toEqual([item]);
});
