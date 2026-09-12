/** @jest-environment node */
import sharp from 'sharp';
jest.mock('@/env', () => ({ SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-key' }));
jest.mock('@/server/lib/supabase', () => ({ VAULT_BUCKET: 'vault-files' }));
import { instagramMediaUrl, retainInstagramThumbnail, retainInstagramThumbnails } from '../instagramThumbnail';

const artist = '50f23458-df64-4381-8042-7333e8b64531';
const source = 'https://scontent.cdninstagram.com/photo.jpg?oe=temporary';
const fetchMock = jest.fn();
let jpeg: Buffer;
function media(body = jpeg, type = 'image/jpeg', length?: string) {
    let done = false;
    return { ok: true, headers: { get: (key: string) => key === 'content-type' ? type : length ?? null },
        body: { getReader: () => ({ read: async () => done ? { done: true } : (done = true, { done: false, value: body }), cancel: jest.fn() }) } };
}
beforeAll(async () => { jpeg = await sharp({ create: { width: 900, height: 600, channels: 3, background: '#cc88dd' } }).jpeg().toBuffer(); });
beforeEach(() => { fetchMock.mockReset(); global.fetch = fetchMock; });

it.each(['http://scontent.cdninstagram.com/a', 'https://cdninstagram.com.evil.test/a', 'https://127.0.0.1/a', 'https://a.fbcdn.net:444/a', 'https://user:pass@a.fbcdn.net/a'])('rejects unsafe media URL %s', value => {
    expect(instagramMediaUrl(value)).toBeNull();
});

it('stores a resized WebP, preserves attribution and uses an immutable public URL', async () => {
    fetchMock.mockResolvedValueOnce(media()).mockResolvedValueOnce({ ok: true });
    const raw = { displayUrl: source, url: 'https://www.instagram.com/p/ABC/', caption: 'Original caption' };
    const retained = await retainInstagramThumbnail(raw, artist, '123') as typeof raw & { _musicnerdThumbnail: { width: number; height: number; sourceUrl: string } };
    expect(retained.url).toBe(raw.url);
    expect(retained.caption).toBe(raw.caption);
    expect(retained.displayUrl).toMatch(new RegExp(`/public/vault-files/${artist}/instagram-123-[a-f0-9]{64}\\.webp$`));
    expect(retained._musicnerdThumbnail).toMatchObject({ width: 640, height: 427, sourceUrl: source });
    const [uploadUrl, options] = fetchMock.mock.calls[1];
    expect(uploadUrl).toContain('/storage/v1/object/vault-files/');
    expect(options.headers['x-upsert']).toBe('false');
    expect((await sharp(options.body).metadata()).format).toBe('webp');
    expect(raw.displayUrl).toBe(source);
    expect(fetchMock.mock.calls[0][1].redirect).toBe('error');
});

it('accepts a duplicate immutable upload on retry', async () => {
    fetchMock.mockResolvedValueOnce(media()).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Duplicate' }) });
    expect(await retainInstagramThumbnail({ displayUrl: source }, artist, '1')).toHaveProperty('_musicnerdThumbnail.version', 1);
});

it.each(['type', 'bytes', 'declared-size', 'stream-size', 'upload'])('does not publish an invalid or failed %s thumbnail', async failure => {
    const response = failure === 'type' ? media(jpeg, 'image/svg+xml') : failure === 'bytes' ? media(Buffer.from('not a jpeg'))
        : failure === 'declared-size' ? media(jpeg, 'image/jpeg', String(9 * 1024 * 1024))
        : failure === 'stream-size' ? media(Buffer.alloc(9 * 1024 * 1024)) : media();
    fetchMock.mockResolvedValueOnce(response).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Unauthorized' }) });
    const result = await retainInstagramThumbnail({ displayUrl: source, _musicnerdThumbnail: { url: 'https://fake.test' } }, artist, '1');
    expect(result).toEqual({ displayUrl: source });
    if (failure !== 'upload') expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('tries a carousel image when the primary image fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('expired')).mockResolvedValueOnce(media()).mockResolvedValueOnce({ ok: true });
    expect(await retainInstagramThumbnail({ displayUrl: source, images: ['https://b.fbcdn.net/cover.jpg'] }, artist, '2'))
        .toHaveProperty('_musicnerdThumbnail.sourceUrl', 'https://b.fbcdn.net/cover.jpg');
});

it('skips collaborator thumbnails and caps downloads at three in flight', async () => {
    let active = 0, max = 0;
    fetchMock.mockImplementation(async (url: string) => {
        if (url.includes('supabase.co')) return { ok: true };
        active++; max = Math.max(max, active);
        await new Promise(resolve => setTimeout(resolve, 5)); active--;
        return media();
    });
    const rows = Array.from({ length: 7 }, (_, index) => ({ artistId: artist, platformPostId: String(index), isOwnPost: index !== 6, raw: { displayUrl: source } }));
    const result = await retainInstagramThumbnails(rows);
    expect(max).toBeLessThanOrEqual(3);
    expect(result.slice(0, 6).every(row => '_musicnerdThumbnail' in row.raw)).toBe(true);
    expect(result[6]).toEqual(rows[6]);
});
