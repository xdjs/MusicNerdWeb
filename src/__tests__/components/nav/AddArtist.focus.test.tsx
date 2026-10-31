import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockPush = jest.fn();
const mockAddArtist = jest.fn();
let mockPathname = '/';
jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
    usePathname: () => mockPathname,
}));
jest.mock('next-auth/react', () => ({
    useSession: () => ({ data: { user: { id: 'reviewer' } }, status: 'authenticated' }),
}));
jest.mock('@/app/actions/addArtist', () => ({ addArtist: (...args: unknown[]) => mockAddArtist(...args) }));
jest.mock('@/lib/analytics/trackEvent', () => ({ trackEvent: jest.fn() }));

// Keep the real Radix dialog, form and buttons: the old dialog mock cannot catch #1621.
import AddArtist from '@/app/_components/nav/components/AddArtist';

beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/';
});

async function openDialog() {
    const trigger = screen.getByRole('button', { name: 'Add new artist' });
    act(() => trigger.focus());
    fireEvent.click(trigger);
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Artist URL' })).toHaveFocus());
    return trigger;
}

it.each(['Escape', 'Close'])('restores focus after %s on repeated opens', async (method) => {
    render(<AddArtist />);
    for (let cycle = 0; cycle < 3; cycle++) {
        const trigger = await openDialog();
        if (method === 'Escape') fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
        else fireEvent.click(screen.getByRole('button', { name: 'Close' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        await waitFor(() => expect(trigger).toHaveFocus());
    }
});

it('wraps Tab and Shift+Tab at the dialog boundaries', async () => {
    render(<AddArtist />);
    await openDialog();
    const input = screen.getByRole('textbox', { name: 'Artist URL' });
    const close = screen.getByRole('button', { name: 'Close' });
    fireEvent.keyDown(input, { key: 'Tab', shiftKey: true });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: 'Tab' });
    expect(input).toHaveFocus();
});

it('still navigates after a successful submission and closes on pathname change', async () => {
    mockAddArtist.mockResolvedValue({ status: 'success', artistId: 'new-artist', artistName: 'Test Artist' });
    const { rerender } = render(<AddArtist />);
    await openDialog();
    fireEvent.change(screen.getByRole('textbox', { name: 'Artist URL' }), {
        target: { value: 'https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add Artist' }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/artist/new-artist'));
    expect(mockAddArtist).toHaveBeenCalledWith('4Z8W4fKeB5YxbusRsdQVPb', 'spotify');
    mockPathname = '/artist/new-artist';
    rerender(<AddArtist />);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

it('does not try to focus a trigger that unmounted with the dialog', async () => {
    const { unmount } = render(<AddArtist />);
    const trigger = await openDialog();
    const focus = jest.spyOn(trigger, 'focus');
    unmount();
    // Radix runs close autofocus after unmount on a timer.
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
    expect(focus).not.toHaveBeenCalled();
    expect(trigger.isConnected).toBe(false);
});
