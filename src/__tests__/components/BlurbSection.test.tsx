/// <reference types="@testing-library/jest-dom" />
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BlurbSection from '@/app/artist/[id]/_components/BlurbSection';
import { EditModeContext } from '@/app/_components/EditModeContext';

jest.mock('@privy-io/react-auth', () => ({usePrivy: () => ({ready:true,authenticated:false,login:jest.fn()}), getAccessToken: jest.fn(async () => 'private-token')}));
jest.mock('@/lib/musicNerdApi/musicNerdApiUrl', () => ({ musicNerdApiUrl: (path: string) => `https://api-preview.test${path}` }));
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));

// Mock the useArtistBio hook
jest.mock('@/hooks/useArtistBio', () => ({
    useArtistBio: jest.fn()
}));

import { useArtistBio } from '@/hooks/useArtistBio';

const getArtistBioVersions = jest.fn().mockResolvedValue({ success: true, versions: [] });
const pinBioVersion = jest.fn().mockResolvedValue({ success: true });
const unpinBio = jest.fn().mockResolvedValue({ success: true });
const deleteBioVersion = jest.fn();
jest.mock('@/lib/musicNerdApi/requestMusicNerdApi', () => ({
  requestMusicNerdApi: (path: string, init?: { method?: string; body?: { versionId?: string } }) => {
    if (path.endsWith('/versions')) return getArtistBioVersions(path);
    if (path.endsWith('/pin')) return init?.method === 'PUT' ? pinBioVersion(init.body?.versionId, path) : unpinBio(path);
    return deleteBioVersion(path);
  },
}));

describe('BlurbSection', () => {
    const defaultProps = {
        artistName: 'Test Artist',
        artistId: 'test-artist-id'
    };

    const longContent = 'This is a very long content that should be more than 200 characters to trigger the Read more functionality. It needs to be long enough to test the character limit check. This should definitely be over 200 characters now.';

    const mockUseArtistBio = useArtistBio as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        getArtistBioVersions.mockResolvedValue({ success: true, versions: [] });
        // Default mock implementation
        mockUseArtistBio.mockReturnValue({
            bio: 'Test bio content',
            loading: false,
            error: null,
            refetch: jest.fn()
        });
    });

    it('explicitly selecting a saved version rebases the editor and locks it', async () => {
        getArtistBioVersions.mockResolvedValue({ success: true, versions: [
            { id: 'v1', bioText: 'Selected saved bio', isPinned: false, createdAt: '2026-01-01' },
        ] });
        render(<EditModeContext.Provider value={{ isEditing: true, canEdit: true, toggle: jest.fn() }}><BlurbSection {...defaultProps} /></EditModeContext.Provider>);
        fireEvent.change(screen.getByPlaceholderText('Enter artist bio...'), { target: { value: 'Unsaved draft' } });
        fireEvent.click(screen.getByText(/version history/i));
        fireEvent.click(await screen.findByRole('button', { name: /^pin$/i }));
        await waitFor(() => expect(screen.getByPlaceholderText('Enter artist bio...')).toHaveValue('Selected saved bio'));
        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: 'Unpin to edit' }));
        await waitFor(() => expect(screen.getByPlaceholderText('Enter artist bio...')).not.toBeDisabled());
        fireEvent.change(screen.getByPlaceholderText('Enter artist bio...'), { target: { value: 'Another draft' } });
        fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
        expect(screen.getByPlaceholderText('Enter artist bio...')).toHaveValue('Selected saved bio');
    });

    it('offers corrections to visitors but not people who can edit this profile', () => {
        const { rerender } = render(<EditModeContext.Provider value={{ isEditing: false, canEdit: false, toggle: jest.fn() }}><BlurbSection {...defaultProps} hero /></EditModeContext.Provider>);
        expect(screen.getByRole('button', {name:'Suggest a correction'})).toBeInTheDocument();
        rerender(<EditModeContext.Provider value={{ isEditing: false, canEdit: true, toggle: jest.fn() }}><BlurbSection {...defaultProps} hero /></EditModeContext.Provider>);
        expect(screen.queryByRole('button', {name:'Suggest a correction'})).not.toBeInTheDocument();
    });

    describe('Basic Rendering', () => {
        it('renders loading state initially', () => {
            mockUseArtistBio.mockReturnValue({
                bio: undefined,
                loading: true,
                error: null,
                refetch: jest.fn()
            });

            render(<BlurbSection {...defaultProps} />);
            
            expect(screen.getByText('Loading summary...')).toBeInTheDocument();
        });

        it('displays AI-generated content when loaded', async () => {
            mockUseArtistBio.mockReturnValue({
                bio: 'AI generated bio content',
                loading: false,
                error: null,
                refetch: jest.fn()
            });

            render(<BlurbSection {...defaultProps} />);
            
            await waitFor(() => {
                expect(screen.getByText('AI generated bio content')).toBeInTheDocument();
            });
        });

        it('displays error message when API fails', async () => {
            mockUseArtistBio.mockReturnValue({
                bio: 'Failed to load summary.',
                loading: false,
                error: 'API Error',
                refetch: jest.fn()
            });

            render(<BlurbSection {...defaultProps} />);
            
            await waitFor(() => {
                expect(screen.getByText('Failed to load summary.')).toBeInTheDocument();
            });
        });
    });

    describe('Full bio (no truncation)', () => {
        it('renders the full bio with no Read more / Show less control', async () => {
            mockUseArtistBio.mockReturnValue({
                bio: longContent,
                loading: false,
                error: null,
                refetch: jest.fn()
            });

            render(<BlurbSection {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText(longContent)).toBeInTheDocument();
                expect(screen.queryByText('Read more')).not.toBeInTheDocument();
                expect(screen.queryByText('Show less')).not.toBeInTheDocument();
            });
        });
    });

    describe('API Integration', () => {
        it('calls the correct API endpoint', async () => {
            const mockRefetch = jest.fn();
            mockUseArtistBio.mockReturnValue({
                bio: 'Test bio content',
                loading: false,
                error: null,
                refetch: mockRefetch
            });

            render(<BlurbSection {...defaultProps} />);
            
            // The hook should be called with the correct artist ID and initialBio (undefined when not provided)
            expect(mockUseArtistBio).toHaveBeenCalledWith('test-artist-id', undefined);
        });

        it('handles non-ok response', async () => {
            mockUseArtistBio.mockReturnValue({
                bio: 'Failed to load summary.',
                loading: false,
                error: 'HTTP 500: Internal Server Error',
                refetch: jest.fn()
            });

            render(<BlurbSection {...defaultProps} />);
            
            await waitFor(() => {
                expect(screen.getByText('Failed to load summary.')).toBeInTheDocument();
            });
        });
    });

    describe('Edit Mode Functionality', () => {
        const renderWithEditMode = (canEdit = true) => {
            return render(
                <EditModeContext.Provider value={{ isEditing: true, canEdit, toggle: jest.fn() }}>
                    <BlurbSection {...defaultProps} />
                </EditModeContext.Provider>
            );
        };

        it('shows textarea in edit mode', async () => {
            mockUseArtistBio.mockReturnValue({
                bio: 'Original bio',
                loading: false,
                error: null,
                refetch: jest.fn()
            });

            renderWithEditMode();
            
            await waitFor(() => {
                expect(screen.getByPlaceholderText('Enter artist bio...')).toBeInTheDocument();
            });
        });

        it('populates textarea with current bio', async () => {
            mockUseArtistBio.mockReturnValue({
                bio: 'Original bio',
                loading: false,
                error: null,
                refetch: jest.fn()
            });

            renderWithEditMode();
            
            await waitFor(() => {
                const textarea = screen.getByPlaceholderText('Enter artist bio...') as HTMLTextAreaElement;
                expect(textarea.value).toBe('Original bio');
            });
        });

        it('updates textarea value when user types', async () => {
            mockUseArtistBio.mockReturnValue({
                bio: 'Original bio',
                loading: false,
                error: null,
                refetch: jest.fn()
            });

            renderWithEditMode();
            
            await waitFor(() => {
                const textarea = screen.getByPlaceholderText('Enter artist bio...') as HTMLTextAreaElement;
                fireEvent.change(textarea, { target: { value: 'Updated bio' } });
                expect(textarea.value).toBe('Updated bio');
            });
        });
    });

    describe('Regenerate Functionality', () => {
        const renderWithEditMode = (canEdit = true) => {
            return render(
                <EditModeContext.Provider value={{ isEditing: true, canEdit, toggle: jest.fn() }}>
                    <BlurbSection {...defaultProps} />
                </EditModeContext.Provider>
            );
        };

        it('updates bio content after successful regeneration in edit mode', async () => {
            const mockRefetch = jest.fn();
            mockUseArtistBio.mockReturnValue({
                bio: 'Original bio',
                loading: false,
                error: null,
                refetch: mockRefetch
            });

            renderWithEditMode();
            
            await waitFor(() => {
                const textarea = screen.getByPlaceholderText('Enter artist bio...') as HTMLTextAreaElement;
                expect(textarea.value).toBe('Original bio');
            });

            // Mock the fetch response for regeneration BEFORE clicking
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({ bio: 'Regenerated bio' })
            });

            fireEvent.click(screen.getByText('Regenerate'));

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText('Enter artist bio...') as HTMLTextAreaElement;
                expect(textarea.value).toBe('Regenerated bio');
            });
        });

        it('handles regenerate API error in edit mode', async () => {
            const mockRefetch = jest.fn();
            mockUseArtistBio.mockReturnValue({
                bio: 'Original bio',
                loading: false,
                error: null,
                refetch: mockRefetch
            });

            renderWithEditMode();
            
            await waitFor(() => {
                const textarea = screen.getByPlaceholderText('Enter artist bio...') as HTMLTextAreaElement;
                expect(textarea.value).toBe('Original bio');
            });

            // Mock the fetch response for regeneration error
            global.fetch = jest.fn().mockRejectedValueOnce(new Error('Regeneration failed'));

            fireEvent.click(screen.getByText('Regenerate'));

            // Should still show original bio after error
            await waitFor(() => {
                const textarea = screen.getByPlaceholderText('Enter artist bio...') as HTMLTextAreaElement;
                expect(textarea.value).toBe('Original bio');
            });
        });

        it('discard restores original bio after regeneration', async () => {
            const mockRefetch = jest.fn();
            mockUseArtistBio.mockReturnValue({
                bio: 'Original bio',
                loading: false,
                error: null,
                refetch: mockRefetch
            });

            renderWithEditMode();
            
            await waitFor(() => {
                const textarea = screen.getByPlaceholderText('Enter artist bio...') as HTMLTextAreaElement;
                expect(textarea.value).toBe('Original bio');
            });

            // Click regenerate
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({ bio: 'Regenerated bio' })
            });

            fireEvent.click(screen.getByText('Regenerate'));

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText('Enter artist bio...') as HTMLTextAreaElement;
                expect(textarea.value).toBe('Regenerated bio');
            });

            // Click discard
            fireEvent.click(screen.getByText('Discard'));

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText('Enter artist bio...') as HTMLTextAreaElement;
                expect(textarea.value).toBe('Original bio');
            });
        });

        it('save updates original bio state', async () => {
            const mockRefetch = jest.fn();
            mockUseArtistBio.mockReturnValue({
                bio: 'Original bio',
                loading: false,
                error: null,
                refetch: mockRefetch
            });

            renderWithEditMode();
            
            await waitFor(() => {
                const textarea = screen.getByPlaceholderText('Enter artist bio...') as HTMLTextAreaElement;
                expect(textarea.value).toBe('Original bio');
            });

            // Edit the bio text
            const textarea = screen.getByPlaceholderText('Enter artist bio...') as HTMLTextAreaElement;
            fireEvent.change(textarea, { target: { value: 'Updated bio' } });

            // Mock successful save
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({ message: 'Bio updated' })
            });

            fireEvent.click(screen.getByText('Save'));

            await waitFor(() => {
                expect(mockRefetch).toHaveBeenCalled();
            });
        });

        it('saves to the API with the Privy token and shows the API error when refused', async () => {
            mockUseArtistBio.mockReturnValue({ bio: 'Original bio', loading: false, error: null, refetch: jest.fn() });
            renderWithEditMode();
            fireEvent.change(screen.getByPlaceholderText('Enter artist bio...'), { target: { value: 'Updated bio' } });
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: false,
                json: async () => ({ status: 'error', error: 'Not your artist' })
            });

            fireEvent.click(screen.getByText('Save'));

            await waitFor(() => expect(mockToast).toHaveBeenCalledWith({ title: 'Error saving bio', description: 'Not your artist' }));
            expect(global.fetch).toHaveBeenCalledWith('https://api-preview.test/api/artistBio/test-artist-id', expect.objectContaining({
                method: 'PUT', body: JSON.stringify({ bio: 'Updated bio' }), credentials: 'omit',
                headers: expect.objectContaining({ Authorization: 'Bearer private-token' }),
            }));
        });
    });

    describe('Edit controls are edit-mode only', () => {
        beforeEach(() => {
            mockUseArtistBio.mockReturnValue({
                bio: 'Some bio',
                loading: false,
                error: null,
                refetch: jest.fn(),
            });
        });

        it('does NOT show Regenerate or Save to Lore in the read view, even for an editor not in edit mode', () => {
            render(
                <EditModeContext.Provider value={{ isEditing: false, canEdit: true, toggle: jest.fn() }}>
                    <BlurbSection {...defaultProps} />
                </EditModeContext.Provider>
            );
            expect(screen.queryByText('Save to Lore')).not.toBeInTheDocument();
            expect(screen.queryByText('Regenerate')).not.toBeInTheDocument();
        });

        it('shows a single Save action and Regenerate in edit mode', () => {
            render(
                <EditModeContext.Provider value={{ isEditing: true, canEdit: true, toggle: jest.fn() }}>
                    <BlurbSection {...defaultProps} />
                </EditModeContext.Provider>
            );
            expect(screen.queryByText('Save to Lore')).not.toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
            expect(screen.getByText('Regenerate')).toBeInTheDocument();
        });
    });
});

it('retains an unsaved About while its build placeholder suspends editing', () => {
    (useArtistBio as jest.Mock).mockReturnValue({bio:'Saved bio',loading:false,refetch:jest.fn()});
    const edit = {isEditing:true,canEdit:true,toggle:jest.fn()};
    const view = (blocked: boolean) => <EditModeContext.Provider value={blocked ? {...edit,isEditing:false,canEdit:false,suspendedEditMode:edit} : edit}><BlurbSection artistId="a1" artistName="Artist" /></EditModeContext.Provider>;
    const {rerender} = render(view(false));
    const input = screen.getByRole('textbox', {name:'Artist biography'});
    fireEvent.change(input,{target:{value:'Unfinished About'}});
    rerender(view(true));
    expect(input).not.toBeVisible();
    rerender(view(false));
    expect(screen.getByRole('textbox', {name:'Artist biography'})).toBe(input);
    expect(input).toHaveValue('Unfinished About');
});

it('preserves About text and Discard baseline across suspended and resume-time saved-bio refreshes', () => {
    const hook = useArtistBio as jest.Mock;
    hook.mockReturnValue({bio:'Original saved bio',loading:false,refetch:jest.fn()});
    const edit={isEditing:true,canEdit:true,toggle:jest.fn()};
    const view=(mode:'edit'|'suspended'|'closed')=><EditModeContext.Provider value={mode==='suspended'?{...edit,isEditing:false,canEdit:false,suspendedEditMode:edit}: {...edit,isEditing:mode==='edit'}}><BlurbSection artistId="a1" artistName="Artist" /></EditModeContext.Provider>;
    const {rerender}=render(view('edit'));
    fireEvent.change(screen.getByRole('textbox',{name:'Artist biography'}),{target:{value:'My unsaved wording'}});
    hook.mockReturnValue({bio:'Research refresh one',loading:false,refetch:jest.fn()});
    rerender(view('suspended'));
    hook.mockReturnValue({bio:'Research refresh two',loading:false,refetch:jest.fn()});
    rerender(view('edit'));
    expect(screen.getByRole('textbox',{name:'Artist biography'})).toHaveValue('My unsaved wording');
    fireEvent.click(screen.getByRole('button',{name:'Discard'}));
    expect(screen.getByRole('textbox',{name:'Artist biography'})).toHaveValue('Original saved bio');
    rerender(view('closed'));
    rerender(view('edit'));
    expect(screen.getByRole('textbox',{name:'Artist biography'})).toHaveValue('Research refresh two');
});
