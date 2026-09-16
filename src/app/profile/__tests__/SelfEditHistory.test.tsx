import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SelfEditHistory from '../SelfEditHistory';

const entry = { id: 'edit-1', artistId: 'artist-1', artistName: 'Fixture Artist', siteName: 'instagram', oldValue: null, newValue: 'first', createdAt: '2026-09-16T12:00:00Z' };
beforeEach(() => { jest.mocked(fetch).mockReset(); });
it('labels self-edit history separately and paginates it', async () => {
    jest.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ entries: [entry], page: 1, pageCount: 2, total: 11 }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ entries: [{ ...entry, oldValue: 'first', newValue: 'second' }], page: 2, pageCount: 2, total: 11 }) } as Response);
    render(<SelfEditHistory />);
    expect(await screen.findByText('Fixture Artist')).toHaveAttribute('href', '/artist/artist-1');
    expect(screen.getByText(/No leaderboard credit/)).toBeInTheDocument();
    expect(screen.getByText('Added instagram link')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next edits' }));
    expect(await screen.findByText('Updated instagram link')).toBeInTheDocument();
    expect(fetch).toHaveBeenLastCalledWith('/api/selfEdits?page=2', expect.objectContaining({ cache: 'no-store' }));
    expect(screen.getByRole('button', { name: 'Next edits' })).toBeDisabled();
});
it('shows an empty state', async () => {
    jest.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ entries: [], page: 1, pageCount: 1, total: 0 }) } as Response);
    render(<SelfEditHistory />);
    expect(await screen.findByText('No profile edits yet.')).toBeInTheDocument();
});
it('shows a retryable error instead of a misleading empty history', async () => {
    jest.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ entries: [], page: 1, pageCount: 1, total: 0 }) } as Response);
    render(<SelfEditHistory />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load profile edits.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByText('No profile edits yet.')).toBeInTheDocument());
});
