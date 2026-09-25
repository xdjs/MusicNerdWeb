// @ts-nocheck
import { render } from '@testing-library/react';
import ResearchImageStack from '../ResearchImageStack';

describe('ResearchImageStack', () => {
    it('overlaps the first four images, decoratively', () => {
        const entries = ['a', 'b', 'c', 'd', 'e'].map(k => ({ key: k, letter: k, images: [{ src: `https://img/${k}.jpg` }] }));
        const { container } = render(<ResearchImageStack entries={entries} />);
        expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
        expect([...container.querySelectorAll('img')].map(i => i.getAttribute('src'))).toEqual(['a', 'b', 'c', 'd'].map(k => `https://img/${k}.jpg`));
    });
});
