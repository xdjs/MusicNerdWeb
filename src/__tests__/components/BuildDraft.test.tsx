// @ts-nocheck
import { render, screen } from '@testing-library/react';
import BuildDraft from '@/app/artist/[id]/_components/onboarding/BuildDraft';

describe('BuildDraft', () => {
    it('is a region named by its label, holding the text as written, line breaks kept', () => {
        render(<BuildDraft label="Lore document" text={'## Overview\nPete Rango makes records [1].'} />);
        const region = screen.getByRole('region', { name: 'Lore document' });
        expect(region).toHaveTextContent('Pete Rango makes records [1].');
        expect(region.querySelector('.whitespace-pre-wrap')?.textContent).toBe('## Overview\nPete Rango makes records [1].');
    });

    it('follows the text to its newest line as it grows', () => {
        const { rerender } = render(<BuildDraft label="About" text="Pete" />);
        const scroller = screen.getByRole('region', { name: 'About' }).querySelector('.overflow-y-auto');
        Object.defineProperty(scroller, 'scrollHeight', { configurable: true, value: 480 });
        rerender(<BuildDraft label="About" text="Pete Rango is a producer from Bogotá." />);
        expect(scroller.scrollTop).toBe(480);
    });
});
