import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SortableArtistLinks from '@/app/_components/SortableArtistLinks';
import { EditModeContext } from '@/app/_components/EditModeContext';
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));
test('the platform icon is the keyboard drag handle and Escape cancels the drag', async () => {
    render(<EditModeContext.Provider value={{ isEditing: true, canEdit: true, toggle: jest.fn() }}>
        <SortableArtistLinks artistId="a1" section="links" canEdit links={[{ siteName: 'spotify', label: 'Spotify', href: 'https://open.spotify.com/artist/1', iconSrc: '/siteIcons/spotify_icon.svg' }]} />
    </EditModeContext.Provider>);
    const icon = screen.getByRole('button', { name: 'Reorder Spotify' });
    icon.focus();
    fireEvent.keyDown(icon, { key: ' ', code: 'Space' });
    await waitFor(() => expect(icon).toHaveAttribute('aria-pressed', 'true'));
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(icon).not.toHaveAttribute('aria-pressed', 'true'));
    expect(screen.getByRole('status')).toHaveTextContent('Dragging was cancelled');
});
