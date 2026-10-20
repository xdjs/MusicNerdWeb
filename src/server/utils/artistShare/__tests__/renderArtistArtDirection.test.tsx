/** @jest-environment node */
jest.mock('next/og', () => ({ ImageResponse: jest.fn((element, options) => ({ element, options })) }));
import { ImageResponse } from 'next/og';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderArtistArtDirection } from '../renderArtistArtDirection';
test.each(['cover', 'sleeve', 'dossier'] as const)('%s preserves public identity and omits unavailable story claims', layout => {
    renderArtistArtDirection('Beyonce\u0301', null, 'Public bio.', layout, 'logo', 'read');
    let [element, options] = (ImageResponse as unknown as jest.Mock).mock.calls.at(-1)!;
    expect(options).toMatchObject({ width: 1200, height: 630 });
    let html = renderToStaticMarkup(element);
    expect(html).toContain('Beyoncé');
    expect(html).toContain('Public bio.');
    expect(html).toContain('Read their story');
    expect(html).not.toContain('<button');
    renderArtistArtDirection('Name', null, null, layout, 'pink', 'read');
    [element] = (ImageResponse as unknown as jest.Mock).mock.calls.at(-1)!;
    html = renderToStaticMarkup(element);
    expect(html).not.toContain('Read their story');
    expect(html).toContain('Get to know Name');
    expect(html).toContain('#ff9ce3');
});
