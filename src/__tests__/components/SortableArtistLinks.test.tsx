import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SortableArtistLinks from '@/app/_components/SortableArtistLinks';
import { EditModeContext } from '@/app/_components/EditModeContext';
const refresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
const links = ['Spotify', 'Deezer'].map(label => ({ siteName: label.toLowerCase(), label, href: `https://${label.toLowerCase()}.com/artist`, iconSrc: `/siteIcons/${label.toLowerCase()}_icon.svg` }));
function view(editing: boolean) {
    return <EditModeContext.Provider value={{ isEditing: editing, canEdit: true, toggle: jest.fn() }}><SortableArtistLinks artistId="a1" section="links" links={links} canEdit /></EditModeContext.Provider>;
}
beforeEach(() => { jest.clearAllMocks(); });
test('only editors can reorder; saves the displayed order to the profile', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
    const { rerender } = render(view(false));
    expect(screen.queryByRole('button', { name: 'Save order' })).not.toBeInTheDocument();
    rerender(view(true));
    fireEvent.click(screen.getByRole('button', { name: 'Move Spotify later' }));
    expect(screen.getAllByRole('link').map(link => link.getAttribute('href'))).toEqual([links[1].href, links[0].href]);
    fireEvent.click(screen.getByRole('button', { name: 'Save order' }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith('/api/artist/link-order', expect.objectContaining({ body: JSON.stringify({ artistId: 'a1', section: 'links', order: ['deezer', 'spotify'] }) }));
    fetchMock.mockRestore();
});
test('failed saves leave the draft available to retry; discard restores the saved order', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, json: async () => ({ error: 'Failed' }) } as Response);
    render(view(true));
    fireEvent.click(screen.getByRole('button', { name: 'Move Spotify later' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save order' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save order' })).not.toBeDisabled());
    expect(refresh).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Discard order' }));
    expect(screen.getAllByRole('link').map(link => link.getAttribute('href'))).toEqual(links.map(link => link.href));
    fetchMock.mockRestore();
});
test('leaving edit mode discards an unsaved order', () => {
    const { rerender } = render(view(true));
    fireEvent.click(screen.getByRole('button', { name: 'Move Spotify later' }));
    rerender(view(false));
    rerender(view(true));
    expect(screen.getByRole('button', { name: 'Save order' })).toBeDisabled();
});
