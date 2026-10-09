import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import SortableArtistLinks from '@/app/_components/SortableArtistLinks';
import EditModeToggle from '@/app/_components/EditModeToggle';
import { EditModeProvider } from '@/app/_components/EditModeContext';
const refresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
let dragEnd: (event: unknown) => void;
// JSDOM has no layout. Drive the drag-end event through the real editor/save flow.
// The keyboard activation is tested separately with the actual dnd sensor.
jest.mock('@dnd-kit/core', () => ({
    ...jest.requireActual('@dnd-kit/core'),
    DndContext: ({ children, onDragEnd }: { children: React.ReactNode; onDragEnd: typeof dragEnd }) => { dragEnd = onDragEnd; return children; },
}));
const links = ['Spotify', 'Deezer'].map(label => ({ siteName: label.toLowerCase(), label, href: `https://${label.toLowerCase()}.com/artist`, iconSrc: `/siteIcons/${label.toLowerCase()}_icon.svg` }));
function view(list = links) {
    return <EditModeProvider canEdit><EditModeToggle /><SortableArtistLinks artistId="a1" section="links" links={list} canEdit /></EditModeProvider>;
}
function drag() { act(() => dragEnd({ active: { id: 'spotify' }, over: { id: 'deezer' } })); }
beforeEach(() => { jest.clearAllMocks(); });
test('the icons themselves are drag buttons; Done persists their order before exiting edit mode', async () => {
    let finish: (response: Response) => void = () => {};
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    render(view());
    expect(screen.queryByRole('button', { name: 'Reorder Spotify' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }));
    const icon = screen.getByRole('button', { name: 'Reorder Spotify' });
    expect(icon.querySelector('img')).toHaveAttribute('alt', 'Spotify');
    expect(screen.queryByRole('button', { name: 'Save order' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Move Spotify later' })).not.toBeInTheDocument();
    drag();
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reorder Spotify' })).toBeDisabled();
    await act(async () => finish({ ok: true } as Response));
    expect(screen.getByRole('button', { name: 'Edit profile' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/artist/link-order', expect.objectContaining({ body: JSON.stringify({ artistId: 'a1', section: 'links', order: ['deezer', 'spotify'] }) }));
    expect(screen.getAllByRole('link').map(link => link.getAttribute('href'))).toEqual([links[1].href, links[0].href]);
    expect(refresh).toHaveBeenCalled();
    fetchMock.mockRestore();
});
test('failed saves keep the draft and edit mode; Done retries it', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Failed' }) } as Response).mockResolvedValue({ ok: true } as Response);
    render(view());
    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }));
    drag();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Done' })).not.toBeDisabled());
    expect(refresh).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit profile' })).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fetchMock.mockRestore();
});
test('a refresh that adds a link preserves a pending reorder', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
    const { rerender } = render(view());
    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }));
    drag();
    rerender(view([...links, { ...links[0], siteName: 'soundcloud', label: 'SoundCloud' }]));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string).order).toEqual(['deezer', 'spotify', 'soundcloud']);
    fetchMock.mockRestore();
});
test('Done without a reordered link does not write', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    render(view());
    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit profile' })).toBeInTheDocument());
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
});

test('marks links that arrived with the build being watched, and only those', () => {
    const { OnboardingProgressContext } = jest.requireActual('@/app/artist/[id]/_components/onboarding/OnboardingProgressContext');
    const value = { steps: { profiles: 't1', vault: null, interview: null, publish: null }, fresh: { profiles: true, vault: false, publish: false }, markSeen: jest.fn(), baseline: { links: ['deezer'], sources: [] } };
    render(<OnboardingProgressContext.Provider value={value}>{view()}</OnboardingProgressContext.Provider>);
    expect(screen.getByRole('link', { name: /spotify/i }).closest('[data-research-new-item]')).not.toBeNull();
    expect(screen.getByRole('link', { name: /deezer/i }).closest('[data-research-new-item]')).toBeNull();
});

test('source-backed platforms share the icon grid but retain source-managed editing', async () => {
    const supplementalLinks = [{siteName:'applemusic',label:'Apple Music',href:'https://music.apple.com/us/artist/pete/1513734272',iconSrc:'/siteIcons/applemusic_icon.svg'}];
    const fetchMock = jest.spyOn(global,'fetch').mockResolvedValue({ok:true} as Response);
    render(<EditModeProvider canEdit><EditModeToggle/><SortableArtistLinks artistId="a1" section="links" links={links} supplementalLinks={supplementalLinks} canEdit/></EditModeProvider>);
    const apple = screen.getByRole('link',{name:'Apple Music'});
    expect(apple.querySelector('img')).toHaveAttribute('src','/siteIcons/applemusic_icon.svg');
    expect(apple.closest('.grid')).toBe(screen.getByRole('link',{name:'Spotify'}).closest('.grid'));
    fireEvent.click(screen.getByRole('button',{name:'Edit profile'}));
    expect(screen.getByRole('button',{name:'Remove Apple Music'})).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Reorder Apple Music'})).not.toBeInTheDocument();
    drag();
    fireEvent.click(screen.getByRole('button',{name:'Done'}));
    await waitFor(()=>expect(refresh).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string).order).toEqual(['deezer','spotify']);
    fetchMock.mockRestore();
});
