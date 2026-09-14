import { fireEvent, render, screen } from '@testing-library/react';
import TimelineArtwork from '../TimelineArtwork';
import type { Moment } from '@/lib/inprocessTimeline';

function moment(kind: Moment['kind'], imageUrl: string | null = 'https://arweave.net/abc'): Moment {
    return { id: '1', title: 'Moment', kind, imageUrl, createdAt: '2026-09-09T13:08:00+00:00', url: 'https://www.inprocess.world/collect/base:0xabc/1' };
}

it('shows the artwork, decorative (empty alt), with the kind badge', () => {
    const { container } = render(<TimelineArtwork moment={moment('image')} />);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', expect.stringContaining('arweave.net/abc'));
    expect(img).toHaveAttribute('alt', '');
    expect(screen.getByText('Image')).toBeInTheDocument();
});

it.each(['video', 'audio'] as const)('adds a play chip for %s', kind => {
    const { container } = render(<TimelineArtwork moment={moment(kind)} />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
});

it.each(['image', 'writing', 'other'] as const)('has no play chip for %s', kind => {
    const { container } = render(<TimelineArtwork moment={moment(kind)} />);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeInTheDocument();
});

it('falls back to the gradient when there is no artwork or it fails to load', () => {
    const { container, rerender } = render(<TimelineArtwork moment={moment('writing', null)} />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('Writing')).toBeInTheDocument();
    rerender(<TimelineArtwork moment={moment('writing')} />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
});
