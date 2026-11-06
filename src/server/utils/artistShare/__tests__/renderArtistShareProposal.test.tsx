/** @jest-environment node */
jest.mock('next/og', () => ({ ImageResponse: jest.fn((element, options) => ({ element, options })) }));
import { ImageResponse } from 'next/og';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderArtistShareProposal } from '../renderArtistShareProposal';
test.each(['editorial', 'portrait', 'profile'] as const)('%s retains public identity, bio and honest invitation', layout => {
    renderArtistShareProposal('Beyonce\u0301', null, 'A public biography.', layout, 'logo', 'meet');
    const [element, options] = (ImageResponse as unknown as jest.Mock).mock.calls.at(-1)!;
    const html = renderToStaticMarkup(element);
    expect(options).toMatchObject({ width: 1200, height: 630 });
    expect(html).toContain('Beyoncé');
    expect(html).toContain('A public biography.');
    expect(html).toContain('Meet Beyoncé');
    expect(html).toContain('Music Nerd glasses');
    expect(html).not.toContain('<button');
    expect(html).not.toContain('musicnerd.net');
    expect(element.props.style.background).toBe('#fb57c0');
    renderArtistShareProposal('坂本龍一', null, null, layout);
    const [fallback] = (ImageResponse as unknown as jest.Mock).mock.calls.at(-1)!;
    expect(renderToStaticMarkup(fallback)).toContain('Get to know the artist');
    expect(renderToStaticMarkup(fallback)).not.toContain('A public biography.');
});
