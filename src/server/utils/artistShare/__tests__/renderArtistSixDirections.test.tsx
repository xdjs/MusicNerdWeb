/** @jest-environment node */
jest.mock('next/og', () => ({ ImageResponse: jest.fn((element, options) => ({ element, options })) }));
import { ImageResponse } from 'next/og';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderArtistSixDirections, sixDirections } from '../renderArtistSixDirections';
test.each(sixDirections)('%s retains accents and honest content fallbacks', layout => {
    renderArtistSixDirections('Beyonce\u0301', null, 'Public biography.', layout, 'logo', 'read');
    let [element, options] = (ImageResponse as unknown as jest.Mock).mock.calls.at(-1)!;
    expect(options).toMatchObject({ width:1200, height:630 });
    let html=renderToStaticMarkup(element);
    expect(html).toContain('Beyoncé');
    expect(html).toContain('Public biography.');
    expect(html).toContain('Read their story');
    renderArtistSixDirections('W'.repeat(90), null, null, layout, 'logo', 'read');
    [element]=(ImageResponse as unknown as jest.Mock).mock.calls.at(-1)!;
    html=renderToStaticMarkup(element);
    expect(html).not.toContain('Read their story');
    expect(html).not.toContain('<button');
    expect(html).not.toContain('musicnerd.net');
    expect(html).toContain('Get to know the artist');
});
