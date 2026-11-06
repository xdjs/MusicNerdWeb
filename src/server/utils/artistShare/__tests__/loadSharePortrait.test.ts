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
    test('close-up uses a square monochrome crop', async () => {
        const bytes = await sharp({ create: { width: 640, height: 640, channels: 3, background: '#fb57c0' } }).png().toBuffer();
        (fetch as jest.Mock).mockResolvedValue({ ok: true, headers: new Headers({ 'content-type': 'image/png' }), body: new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close(); } }) });
        const result = await loadSharePortrait('https://i.scdn.co/image/abc', 'id', true);
        const png = Buffer.from(result!.split(',')[1], 'base64');
        expect(await sharp(png).metadata()).toMatchObject({ width: 640, height: 640, format: 'png' });
        const [r, g, b] = await sharp(png).removeAlpha().raw().toBuffer();
        expect(r).toBe(g);
        expect(g).toBe(b);
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
