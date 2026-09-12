import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    fireEvent.click(screen.getByRole('button', { name: 'Minimize chat' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
    fireEvent.click(trigger);
    expect(screen.getByText(/Nova started recording/)).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockRestore();
});


it('keeps the profile interactive and preserves an unfinished question when minimized', () => {
    const outside = jest.fn();
    render(<><button onClick={outside}>Profile action</button><ArtistAskSheet artistId="nova-id" artistName="Nova" /></>);
    const trigger = screen.getByRole('button', { name: 'Ask about Nova' });
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'false');
    const input = screen.getByRole('textbox');
    expect(input).not.toHaveFocus();
    fireEvent.change(input, { target: { value: 'A question in progress' } });
    fireEvent.click(screen.getByRole('button', { name: 'Profile action' }));
    expect(outside).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog')).toBeVisible();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    fireEvent.keyDown(trigger, { key: 'Enter' });
    fireEvent.click(trigger);
    expect(screen.getByRole('textbox')).toHaveFocus();
    expect(screen.getByRole('textbox')).toHaveValue('A question in progress');
});

it('keeps earlier answers and sources when the next question fails, then allows a retry', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
        .mockResolvedValueOnce({ ok: true, json: async () => ({ answer: 'First answer.', sources: [{ n: 1, title: 'First source', url: 'https://example.com/first' }], suggestions: [] }) } as Response)
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValueOnce({ ok: true, json: async () => ({ answer: 'Second answer.', sources: [], suggestions: [] }) } as Response);
    render(<ArtistAskSheet artistId="nova-id" artistName="Nova" />);
    fireEvent.click(screen.getByRole('button', { name: 'Ask about Nova' }));
    fireEvent.click(screen.getByRole('button', { name: 'How did Nova get started?' }));
    await screen.findByText('First answer.');
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'What came next?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit question' }));
    await screen.findByRole('alert');
    expect(screen.getByText('First answer.')).toBeVisible();
    expect(screen.getByRole('link', { name: /example.com/ })).toHaveAttribute('href', 'https://example.com/first');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('Second answer.');
    expect(screen.getByText('First answer.')).toBeVisible();
    fetchMock.mockRestore();
});

it('moves the panel above the mobile keyboard and releases viewport listeners when minimized', () => {
    const original = window.visualViewport;
    const viewport = Object.assign(new EventTarget(), { height: window.innerHeight - 300, offsetTop: 0 });
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
    const remove = jest.spyOn(viewport, 'removeEventListener');
    render(<ArtistAskSheet artistId="nova-id" artistName="Nova" />);
    fireEvent.click(screen.getByRole('button', { name: 'Ask about Nova' }));
    expect(screen.getByRole('dialog')).toHaveStyle({ bottom: '308px', maxHeight: `${viewport.height - 16}px` });
    act(() => {
        viewport.height = window.innerHeight;
        viewport.dispatchEvent(new Event('resize'));
    });
    expect(screen.getByRole('dialog').style.bottom).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Minimize chat' }));
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: original });
});

it('finishes an in-flight answer while minimized without resubmitting when reopened', async () => {
    let resolve!: (response: Response) => void;
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(() => new Promise<Response>(done => { resolve = done; }));
    render(<ArtistAskSheet artistId="nova-id" artistName="Nova" />);
    const trigger = screen.getByRole('button', { name: 'Ask about Nova' });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'How did Nova get started?' }));
    expect(screen.getByRole('status')).toHaveTextContent('Finding an answer');
    fireEvent.click(screen.getByRole('button', { name: 'Minimize chat' }));
    await act(async () => resolve({ ok: true, json: async () => ({ answer: 'Ready when you return.', suggestions: [] }) } as Response));
    fireEvent.click(trigger);
    expect(screen.getByText('Ready when you return.')).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockRestore();
});

it('lets Escape close record links before minimizing the chat', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async url => ({
        ok: true,
        json: async () => String(url).includes('/api/trackLinks') ? { links: [] } : {
            answer: 'Listen to First Song.', suggestions: [],
            songs: [{ title: 'First Song', spotifyUrl: 'https://open.spotify.com/album/first' }],
        },
    } as Response));
    render(<ArtistAskSheet artistId="nova-id" artistName="Nova" />);
    fireEvent.click(screen.getByRole('button', { name: 'Ask about Nova' }));
    fireEvent.click(screen.getByRole('button', { name: 'How did Nova get started?' }));
    const song = await screen.findByRole('button', { name: 'First Song' });
    fireEvent.click(song);
    await screen.findByText('Nowhere else we could find it.');
    fireEvent.keyDown(song, { key: 'Escape' });
    expect(screen.queryByRole('group', { name: 'Where to hear First Song' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeVisible();
    fireEvent.keyDown(song, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fetchMock.mockRestore();
});
