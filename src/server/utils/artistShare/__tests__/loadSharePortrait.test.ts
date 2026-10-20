/** @jest-environment node */
jest.mock('@/env', () => ({ SUPABASE_URL: '' }));
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { loadSharePortrait } from '../loadSharePortrait';
describe('loadSharePortrait', () => {
    beforeEach(() => { global.fetch = jest.fn(); });
    test('never fetches arbitrary URLs', async () => {
        expect(await loadSharePortrait('https://localhost/private', 'id')).toBeNull();
        expect(fetch).not.toHaveBeenCalled();
    });
    test('normalizes a successful portrait to a 480 by 534 PNG', async () => {
        const bytes = readFileSync('public/demo/pete-rango-logo.png');
        (fetch as jest.Mock).mockResolvedValue({ ok: true, headers: new Headers({ 'content-type': 'image/png' }), body: new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close(); } }) });
        const result = await loadSharePortrait('https://i.scdn.co/image/abc', 'id');
        expect(result).toMatch(/^data:image\/png;base64,/);
        expect(await sharp(Buffer.from(result!.split(',')[1], 'base64')).metadata()).toMatchObject({ width: 480, height: 534, format: 'png' });
    });
    test('rejects invalid image bytes', async () => {
        (fetch as jest.Mock).mockResolvedValue({ ok: true, headers: new Headers({ 'content-type': 'image/png' }), body: new ReadableStream({ start(controller) { controller.enqueue(Buffer.from('not an image')); controller.close(); } }) });
        expect(await loadSharePortrait('https://i.scdn.co/image/abc', 'id')).toBeNull();
    });
    test('redirects and failures use fallback', async () => {
        (fetch as jest.Mock).mockResolvedValue({ ok: false, status: 302 });
        expect(await loadSharePortrait('https://i.scdn.co/image/abc', 'id')).toBeNull();
        expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ redirect: 'error', credentials: 'omit' }));
    });
    test('rejects oversized and non-image responses', async () => {
        (fetch as jest.Mock).mockResolvedValue({ ok: true, headers: new Headers({ 'content-type': 'text/html' }) });
        expect(await loadSharePortrait('https://i.scdn.co/image/abc', 'id')).toBeNull();
        (fetch as jest.Mock).mockResolvedValue({ ok: true, headers: new Headers({ 'content-type': 'image/png', 'content-length': '6000000' }) });
        expect(await loadSharePortrait('https://i.scdn.co/image/abc', 'id')).toBeNull();
    });
});
