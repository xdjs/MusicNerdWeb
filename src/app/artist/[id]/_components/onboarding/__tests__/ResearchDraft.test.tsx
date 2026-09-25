// @ts-nocheck
import { render, screen } from '@testing-library/react';
import ResearchDraft from '../ResearchDraft';

describe('ResearchDraft', () => {
    it('is a region named by its label that renders the draft as Markdown', () => {
        render(<ResearchDraft label="Lore document" text={'## overview\nBio Ritmo is a salsa band.'} />);
        const region = screen.getByRole('region', { name: 'Lore document' });
        expect(region).toHaveTextContent('Bio Ritmo is a salsa band.');
        expect(region.querySelector('[data-testid="streamdown"]')).not.toBeNull();
    });

    it('shows citation markers as quiet superscripts', () => {
        render(<ResearchDraft label="About" text="formed in 1991 [1][2]." />);
        const sups = screen.getByRole('region', { name: 'About' }).querySelectorAll('sup');
        expect([...sups].map(s => s.textContent)).toEqual(['[1]', '[2]']);
        expect(sups[0].className).toContain('text-[hsl(var(--muted-foreground))]');
    });
});
