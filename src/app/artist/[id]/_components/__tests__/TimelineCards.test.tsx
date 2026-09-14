import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import TimelineCards from '../TimelineCards';
import type { Moment } from '@/lib/inprocessTimeline';

const TIMELINE_URL = 'https://www.inprocess.world/0x1f8dadb40c2cdb0d6d281add31c76e14f8ba6a91';

function moment(id: string, kind: Moment['kind'], title = `Moment ${id}`): Moment {
    return {
        id, title, kind, createdAt: '2026-09-09T13:08:00+00:00',
        imageUrl: `https://arweave.net/${id}`,
        url: `https://www.inprocess.world/collect/base:0xbfaab156f4d1d7b4f5a3b1f0f5b7a2c3d4e5f607/${id}`,
    };
}

const moments = [moment('1', 'video', 'Two Human Hands (VISUAL EP) [V.1]'), moment('2', 'audio'), moment('3', 'writing'), moment('4', 'video')];

it('renders the heading, the subtitle without a count, and the link out to In Process', () => {
    render(<TimelineCards moments={moments} timelineUrl={TIMELINE_URL} />);
    expect(screen.getByRole('heading', { name: 'Timeline' })).toBeInTheDocument();
    expect(screen.getByText('Latest moments')).toBeInTheDocument();
    const out = screen.getByRole('link', { name: /View timeline/ });
    expect(out).toHaveAttribute('href', TIMELINE_URL);
    expect(out).toHaveAttribute('target', '_blank');
    expect(out).toHaveAttribute('rel', 'noopener noreferrer');
});

it('shows one card per moment, badged by kind, linking to the moment on In Process', () => {
    render(<TimelineCards moments={moments} timelineUrl={TIMELINE_URL} />);
    const gallery = screen.getByRole('region', { name: 'Moments' });
    expect(gallery).toHaveClass('scrollbar-hide');
    const cards = within(gallery).getAllByRole('link');
    expect(cards).toHaveLength(4);
    expect(cards[0]).toHaveAttribute('href', moments[0].url);
    expect(cards[0]).toHaveAttribute('target', '_blank');
    expect(within(cards[0]).getByText('Video')).toBeInTheDocument();
    expect(within(cards[0]).getByRole('heading', { name: 'Two Human Hands (VISUAL EP) [V.1]' })).toBeInTheDocument();
    expect(within(cards[0]).getByText('Sep 9, 2026')).toHaveAttribute('datetime', '2026-09-09T13:08:00+00:00');
    expect(within(cards[1]).getByText('Audio')).toBeInTheDocument();
    expect(within(cards[2]).getByText('Writing')).toBeInTheDocument();
});

it('offers a pill per kind present, in order, and filters the row', () => {
    render(<TimelineCards moments={moments} timelineUrl={TIMELINE_URL} />);
    const pills = within(screen.getByLabelText('Filter moments by type')).getAllByRole('button');
    expect(pills.map(pill => pill.textContent)).toEqual(['All (4)', 'Video (2)', 'Audio (1)', 'Writing (1)']);
    expect(pills[0]).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Audio (1)' }));
    const cards = within(screen.getByRole('region', { name: 'Moments' })).getAllByRole('link');
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveAttribute('href', moments[1].url);
    expect(screen.getByRole('button', { name: 'Audio (1)' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'All (4)' })).toHaveAttribute('aria-pressed', 'false');
});

it('falls back to All when the selected kind is gone after the moments change', () => {
    const { rerender } = render(<TimelineCards moments={moments} timelineUrl={TIMELINE_URL} />);
    fireEvent.click(screen.getByRole('button', { name: 'Audio (1)' }));
    expect(within(screen.getByRole('region', { name: 'Moments' })).getAllByRole('link')).toHaveLength(1);
    rerender(<TimelineCards moments={[moment('9', 'video'), moment('10', 'image')]} timelineUrl={TIMELINE_URL} />);
    expect(within(screen.getByRole('region', { name: 'Moments' })).getAllByRole('link')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'All (2)' })).toHaveAttribute('aria-pressed', 'true');
});

it('rewinds the row when the filter changes', () => {
    render(<TimelineCards moments={moments} timelineUrl={TIMELINE_URL} />);
    const gallery = screen.getByRole('region', { name: 'Moments' });
    gallery.scrollLeft = 240;
    fireEvent.click(screen.getByRole('button', { name: 'Video (2)' }));
    expect(gallery.scrollLeft).toBe(0);
});

it('hides the pills when every moment is the same kind', () => {
    render(<TimelineCards moments={[moment('1', 'image'), moment('2', 'image')]} timelineUrl={TIMELINE_URL} />);
    expect(screen.queryByLabelText('Filter moments by type')).not.toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Moments' })).getAllByRole('link')).toHaveLength(2);
});

it('falls back to the gradient when a moment has no artwork', () => {
    render(<TimelineCards moments={[{ ...moment('1', 'writing'), imageUrl: null }]} timelineUrl={TIMELINE_URL} />);
    const card = within(screen.getByRole('region', { name: 'Moments' })).getByRole('link');
    expect(within(card).queryByRole('img')).not.toBeInTheDocument();
    expect(within(card).getByText('Writing')).toBeInTheDocument();
});
