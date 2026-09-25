// @ts-nocheck
import { render, fireEvent } from '@testing-library/react';
import ResearchAvatar from '../ResearchAvatar';

describe('ResearchAvatar', () => {
    it('shows the first image, falls back to the next when it fails, then to the letter', () => {
        const { container } = render(<ResearchAvatar images={[{ src: 'https://img/profile.jpg' }, { src: 'https://img/logo.png', inset: true }]} letter="s" />);
        expect(container.querySelector('img')).toHaveAttribute('src', 'https://img/profile.jpg');
        fireEvent.error(container.querySelector('img'));
        expect(container.querySelector('img')).toHaveAttribute('src', 'https://img/logo.png');
        fireEvent.error(container.querySelector('img'));
        expect(container.querySelector('img')).toBeNull();
        expect(container).toHaveTextContent('s');
    });

    it('skips missing images', () => {
        const { container } = render(<ResearchAvatar images={[{ src: null }, { src: 'https://img/logo.png', inset: true }]} letter="s" />);
        expect(container.querySelector('img')).toHaveAttribute('src', 'https://img/logo.png');
        render(<ResearchAvatar images={[{ src: null }]} letter="d" />);
    });
});
