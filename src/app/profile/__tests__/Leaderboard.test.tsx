import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Leaderboard from '../Leaderboard';

const entry = (userId: string, ugcCount: number, artistsCount: number, isHidden = false) => ({
    userId, wallet: userId, username: userId, email: null, ugcCount, artistsCount, isHidden,
});

beforeEach(() => {
    jest.mocked(fetch).mockReset();
});

it('renders only two podium rows, with no bronze placeholder', async () => {
    jest.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({
        entries: [entry('ugc-only', 1, 0), entry('artist-only', 0, 1)], total: 2, pageCount: 1,
    }) } as Response);
    const { container } = render(<Leaderboard highlightIdentifier="inactive-account" />);
    await screen.findAllByText('ugc-only');
    expect(container.querySelectorAll('[data-podium="true"]')).toHaveLength(2);
    expect(screen.getAllByText('🥇')).toHaveLength(2); // mobile and desktop
    expect(screen.getAllByText('🥈')).toHaveLength(2);
    expect(screen.queryByText('🥉')).not.toBeInTheDocument();
    expect(container.querySelector('#leaderboard-current-user')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
});

it('shows an empty state in every period without inserting the highlighted user', async () => {
    jest.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ entries: [], total: 0, pageCount: 0 }) } as Response);
    const { container } = render(<Leaderboard highlightIdentifier="inactive-account" />);
    for (const label of ['Today', 'Last Week', 'Last Month', 'All Time']) {
        fireEvent.click(screen.getByRole('button', { name: label }));
        await screen.findByText('No contributions in this period yet. Be the first!');
        expect(container.querySelectorAll('[data-podium]')).toHaveLength(0);
        expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
    }
    await waitFor(() => expect(fetch).toHaveBeenLastCalledWith('/api/leaderboard?page=1&perPage=10'));
});

it('keeps hidden contributors unranked', async () => {
    jest.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({
        entries: [entry('visible', 1, 0), entry('hidden', 0, 1, true)], total: 2, pageCount: 1,
    }) } as Response);
    const { container } = render(<Leaderboard />);
    await screen.findAllByText('hidden');
    expect(container.querySelectorAll('[data-podium="true"]')).toHaveLength(1);
    expect(screen.getAllByText('N/A')).toHaveLength(2);
});
