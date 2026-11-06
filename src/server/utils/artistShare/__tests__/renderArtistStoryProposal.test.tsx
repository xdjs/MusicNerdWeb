/** @jest-environment node */
jest.mock('next/og', () => ({ ImageResponse: jest.fn((element, options) => ({ element, options })) }));
import { ImageResponse } from 'next/og';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderArtistStoryProposal } from '../renderArtistStoryProposal';
test('keeps the public excerpt and larger invitation together without invented biography', () => {
    renderArtistStoryProposal('Beyonce\u0301', null, 'Public bio.', 'logo', 'story');
    const [element, options] = (ImageResponse as unknown as jest.Mock).mock.calls.at(-1)!;
    const html = renderToStaticMarkup(element);
    expect(options).toMatchObject({ width: 1200, height: 630 });
    expect(html).toContain('Beyoncé');
    expect(html).toContain('Public bio.');
    expect(html).toContain('Their music. Their story.');
    expect(html).toContain('font-size:40px');
    expect(html).toContain('font-size:36px');
    expect(html).not.toContain('<button');
    renderArtistStoryProposal('Beta Radio', null, null, 'white', 'story');
    const [missing] = (ImageResponse as unknown as jest.Mock).mock.calls.at(-1)!;
    const fallback = renderToStaticMarkup(missing);
    expect(fallback).toContain('Get to know Beta Radio');
    expect(fallback).not.toContain('Their story');
    expect(fallback).not.toContain('Public bio.');
});
