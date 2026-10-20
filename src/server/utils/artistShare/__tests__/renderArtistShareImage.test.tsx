/** @jest-environment node */
jest.mock('next/og', () => ({ ImageResponse: jest.fn((element, options) => ({ element, options })) }));
import { ImageResponse } from 'next/og';
import { renderArtistShareImage } from '../renderArtistShareImage';
import { renderToStaticMarkup } from 'react-dom/server';
describe('renderArtistShareImage', () => {
    test('composes public name, portrait and branding at social dimensions', () => {
        renderArtistShareImage('Dutchyyy', 'data:image/png;base64,abc');
        const [element, options] = (ImageResponse as unknown as jest.Mock).mock.calls.at(-1)!;
        expect(options).toMatchObject({ width: 1200, height: 630 });
        const html = renderToStaticMarkup(element);
        expect(html).toContain('Dutchyyy');
        expect(html).toContain('Music Nerd');
        expect(html).toContain('data:image/png');
    });
    test.each(['Björk', 'Beyoncé', 'LATASHÁ'])('passes the supported artist name %s unchanged to the renderer', name => {
        renderArtistShareImage(name, null);
        const [element] = (ImageResponse as unknown as jest.Mock).mock.calls.at(-1)!;
        expect(renderToStaticMarkup(element)).toContain(name);
    });
    test('passes NFC-normalized text to the renderer', () => {
        renderArtistShareImage('Beyonce\u0301', null);
        const [element] = (ImageResponse as unknown as jest.Mock).mock.calls.at(-1)!;
        expect(renderToStaticMarkup(element)).toContain('Beyoncé');
    });
    test('fallback and long names stay bounded and escaped', () => {
        renderArtistShareImage('<script>' + 'Long '.repeat(40), null);
        const [element] = (ImageResponse as unknown as jest.Mock).mock.calls.at(-1)!;
        const html = renderToStaticMarkup(element);
        expect(html).toContain('…');
        expect(html).toContain('&lt;script&gt;');
        expect(html).not.toContain('<img');
        expect(html).not.toContain('Long '.repeat(40));
    });
});
