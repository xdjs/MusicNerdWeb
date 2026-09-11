import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { EditModeProvider } from '@/app/_components/EditModeContext';
import EditModeToggle from '@/app/_components/EditModeToggle';
import BlurbSection from '@/app/artist/[id]/_components/BlurbSection';
import VaultSection from '@/app/artist/[id]/_components/VaultSection';
const refresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
jest.mock('@/app/artist/[id]/_components/VaultManager', () => function Manager() { return null; });
jest.mock('@/app/actions/dashboardActions', () => ({ getArtistBioVersions: jest.fn(), unpinBioAction: jest.fn(), saveCurrentBio: jest.fn() }));
import { getArtistBioVersions, unpinBioAction, saveCurrentBio } from '@/app/actions/dashboardActions';
const original = 'The artist’s original biography.';
const edited = 'The artist’s revised biography, saved in their own words.';
function view() {
    return <EditModeProvider canEdit><EditModeToggle />
        <BlurbSection artistId="a1" artistName="Test Artist" initialBio={original} hero portrait />
        <VaultSection artistId="a1" pendingSources={[]} approvedSources={[]} />
    </EditModeProvider>;
}
beforeEach(() => { jest.clearAllMocks(); });
test('one Save updates the biography and exposes its preserved version in Lore', async () => {
    const versions = [{ id: 'old', artistId: 'a1', bioText: original, isPinned: false, createdAt: '2026-09-10T00:00:00Z' }];
    (getArtistBioVersions as jest.Mock).mockImplementation(async () => ({ success: true, versions }));
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (_url, init) => {
        if (init?.method === 'PUT') {
            expect(JSON.parse(init.body as string)).toEqual({ bio: edited });
            versions.push({ id: 'new', artistId: 'a1', bioText: edited, isPinned: false, createdAt: '2026-09-11T00:00:00Z' });
        }
        return { ok: true, json: async () => ({ bio: edited }) } as Response;
    });
    render(view());
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.queryByRole('button', { name: 'Save to Lore' })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Show version history (1)' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Show version history (1)' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Artist biography' }), { target: { value: edited } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Hide version history (2)' })).toBeInTheDocument());
    const savedBios = screen.getByRole('heading', { name: 'Saved bios' }).parentElement!;
    expect(within(savedBios).getByText(edited)).toBeInTheDocument();
    expect(within(savedBios).getByText(original)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Saved bios' }).closest('#mn-sources')).toBeInTheDocument();
    expect(saveCurrentBio).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'PUT')).toHaveLength(1);
    fetchMock.mockRestore();
});
test('unpin unlocks the existing bio without fetching or generating another bio', async () => {
    let pinned = true;
    (getArtistBioVersions as jest.Mock).mockImplementation(async () => ({ success: true, versions: [{ id: 'v1', artistId: 'a1', bioText: original, isPinned: pinned, createdAt: '2026-09-11T00:00:00Z' }] }));
    (unpinBioAction as jest.Mock).mockImplementation(async () => { pinned = false; return { success: true }; });
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ bio: original }) } as Response);
    render(view());
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await waitFor(() => expect(screen.getByRole('textbox')).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Regenerate' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Unpin to edit' }));
    await waitFor(() => expect(screen.getByRole('textbox')).not.toBeDisabled());
    expect(unpinBioAction).toHaveBeenCalledWith('a1');
    expect(screen.getByRole('textbox')).toHaveValue(original);
    expect(screen.queryByText('Loading summary...')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Regenerate' })).toBeEnabled();
    // Generation still requires its own explicit click after unpinning.
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/artistBio/a1', expect.objectContaining({
        method: 'PUT', body: JSON.stringify({ regenerate: true }),
    })));
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue(original));
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'PUT')).toHaveLength(1);
    fetchMock.mockRestore();
});
