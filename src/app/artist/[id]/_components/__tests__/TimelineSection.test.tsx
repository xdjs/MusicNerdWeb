import { render, screen } from '@testing-library/react';
import type { Moment } from '@/lib/inprocessTimeline';

jest.mock('@/server/utils/fetchArtistTimeline', () => ({ fetchArtistTimeline: jest.fn() }));

import { fetchArtistTimeline } from '@/server/utils/fetchArtistTimeline';
import TimelineSection from '../TimelineSection';

beforeEach(() => jest.clearAllMocks());

const ADDRESS = '0x1f8dadb40c2cdb0d6d281add31c76e14f8ba6a91';
const TIMELINE_URL = `https://www.inprocess.world/${ADDRESS}`;
const moment: Moment = {
    id: '1', title: 'Two Human Hands (EP)', kind: 'audio', createdAt: '2026-09-04T00:00:00+00:00',
    imageUrl: 'https://arweave.net/abc', url: 'https://www.inprocess.world/collect/base:0xabc/1',
};

it('renders the section when the artist has moments, linking out to their In Process page', async () => {
    (fetchArtistTimeline as jest.Mock).mockResolvedValue([moment]);
    render(await TimelineSection({ inprocess: ADDRESS }));
    expect(fetchArtistTimeline).toHaveBeenCalledWith(ADDRESS);
    expect(screen.getByRole('heading', { name: 'Timeline' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View timeline/ })).toHaveAttribute('href', TIMELINE_URL);
    expect(screen.getByRole('link', { name: 'Open Two Human Hands (EP) on In Process' })).toHaveAttribute('href', moment.url);
});

it('renders nothing when the timeline is empty or In Process failed', async () => {
    (fetchArtistTimeline as jest.Mock).mockResolvedValue([]);
    const { container } = render(await TimelineSection({ inprocess: ADDRESS }));
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('heading', { name: 'Timeline' })).not.toBeInTheDocument();
});

it('renders nothing, without fetching, when the stored value is not an In Process address', async () => {
    const { container } = render(await TimelineSection({ inprocess: 'not-an-address' }));
    expect(container).toBeEmptyDOMElement();
    expect(fetchArtistTimeline).not.toHaveBeenCalled();
});
