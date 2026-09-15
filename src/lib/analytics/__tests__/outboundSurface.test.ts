import { outboundSurface } from '@/lib/analytics/outboundSurface';

function build(html: string): Element {
    document.body.innerHTML = html;
    return document.querySelector('a')!;
}

describe('outboundSurface', () => {
    it('uses the nearest data-analytics-surface, which portalled dialogs carry', () => {
        expect(outboundSurface(build('<div data-analytics-surface="latest"><p><a href="x">x</a></p></div>'))).toBe('latest');
    });

    it('falls back to the enclosing mn-* section id', () => {
        expect(outboundSurface(build('<section id="mn-links"><a href="x">x</a></section>'))).toBe('links');
    });

    it('prefers the explicit attribute over an outer section', () => {
        expect(outboundSurface(build('<section id="mn-latest"><div data-analytics-surface="listen"><a href="x">x</a></div></section>'))).toBe('listen');
    });

    it('reports page when neither is present', () => {
        expect(outboundSurface(build('<div><a href="x">x</a></div>'))).toBe('page');
    });
});
