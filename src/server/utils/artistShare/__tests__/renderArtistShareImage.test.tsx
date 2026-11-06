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
    test('uses the selected mixed-case invitation and black composition without About or an arrow', () => {
        renderArtistShareImage('LATASHÁ', null);
        const [element, options] = (ImageResponse as unknown as jest.Mock).mock.calls.at(-1)!;
        const html = renderToStaticMarkup(element);
        expect(options).toMatchObject({ width: 1200, height: 630 });
        expect(element.props.style).toMatchObject({ background: '#000000', fontFamily: 'Inter' });
        expect(html).toContain('Nerd out on');
        expect(html).toContain('LATASHÁ');
        expect(html).not.toContain('LATASHÁ.');
        expect(html).toContain('Music Nerd glasses');
        expect(html).toContain('letter-spacing:-0.045em');
        expect(html).not.toMatch(/Explore the artist|<button|<circle|→|NERD OUT ON/);
        expect((html.match(/<img /g) ?? []).length).toBe(1);
    });
    test('unsupported scripts use grammatical neutral image text', () => {
        renderArtistShareImage('坂本龍一', null);
        const [element] = (ImageResponse as unknown as jest.Mock).mock.calls.at(-1)!;
        const html = renderToStaticMarkup(element);
        expect(html).toContain('this artist');
        expect(html).not.toContain('Discover this artist');
        expect(html).not.toContain('坂本龍一');
    });
    test('a missing portrait uses the selected complete, large side-by-side glasses', () => {
        renderArtistShareImage('Pete Rango', null);
        const [element] = (ImageResponse as unknown as jest.Mock).mock.calls.at(-1)!;
        const html = renderToStaticMarkup(element);
        expect(html).toContain('width="484"');
        expect(html).toContain('left:668px');
        expect(html).toContain('top:137px');
        expect(html).toContain('width:600px');
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
        expect(html).toContain('-webkit-line-clamp:2');
        expect(html).toContain('Music Nerd glasses');
        expect(html).not.toContain('Long '.repeat(40));
    });
});
