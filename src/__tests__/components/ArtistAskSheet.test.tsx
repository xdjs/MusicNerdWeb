import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ArtistAskSheet from '@/app/artist/[id]/_components/ArtistAskSheet';

it('opens existing suggested questions, submits the artist ID, and renders real citation links in the sheet', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({
        answer: 'Nova started recording in a home studio.[1]',
        sources: [{ n: 1, title: 'Studio interview', url: 'https://example.com/interview' }],
    }) } as Response);
    render(<ArtistAskSheet artistId="nova-id" artistName="Nova" />);
    const trigger = screen.getByRole('button', { name: 'Ask about Nova' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'How did Nova get started?' }));
    await waitFor(() => expect(screen.getByText(/Nova started recording/)).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith('/api/askArtist', expect.objectContaining({
        method: 'POST', body: JSON.stringify({ artistId: 'nova-id', question: 'How did Nova get started?' }),
    }));
    expect(screen.getAllByRole('link').some(link => link.getAttribute('href') === 'https://example.com/interview')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fetchMock.mockRestore();
});
