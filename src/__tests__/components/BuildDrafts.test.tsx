// @ts-nocheck
import { render, screen } from '@testing-library/react';
import BuildDrafts from '@/app/artist/[id]/_components/onboarding/BuildDrafts';

const writing = (stage, text) => ({ kind: 'writing', stage, text });

describe('BuildDrafts', () => {
    it('renders one labelled block per draft that has text, Lore document first', () => {
        render(<BuildDrafts items={[writing('about', 'An About.'), writing('doc', '## Overview')]} />);
        const regions = screen.getAllByRole('region');
        expect(regions.map(r => r.getAttribute('aria-label'))).toEqual(['Lore document', 'About']);
        expect(regions[0]).toHaveTextContent('## Overview');
        expect(regions[1]).toHaveTextContent('An About.');
    });

    it('renders nothing before anything has been written', () => {
        const { container } = render(<BuildDrafts items={[{ kind: 'progress', group: 'about-write', done: false }]} />);
        expect(container).toBeEmptyDOMElement();
    });
});
