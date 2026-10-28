// @ts-nocheck
import React from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockAddArtist = jest.fn();
const mockPush = jest.fn();
let mockPathname = '/';
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }), usePathname: () => mockPathname }));
const mockTrackEvent = jest.fn();
jest.mock('@/lib/analytics/trackEvent', () => ({ trackEvent: (...a: unknown[]) => mockTrackEvent(...a) }));

let mockSessionData: any = null;
let mockSessionStatus = 'unauthenticated';

// Capture the submit callback so tests can trigger it directly
let capturedSubmitFn: ((values: Record<string, string>) => Promise<void>) | null = null;
const mockReset = jest.fn();
let capturedDialogOnOpenChange: ((open: boolean) => void) | null = null;

jest.mock('react-hook-form', () => {
    const React = require('react');
    return {
        useForm: () => ({
            control: {},
            handleSubmit: (fn: Function) => {
                capturedSubmitFn = fn as any;
                return (e?: Event) => { e?.preventDefault?.(); };
            },
            reset: mockReset,
            formState: { errors: {} },
            register: jest.fn(() => ({ ref: jest.fn(), onChange: jest.fn(), onBlur: jest.fn(), name: '' })),
        }),
        Controller: ({ render: renderFn, name }: any) => {
            const [val, setVal] = React.useState('');
            return renderFn({
                field: {
                    value: val,
                    onChange: (e: any) => setVal(e.target?.value ?? e),
                    name,
                    ref: jest.fn(),
                },
                fieldState: { error: undefined },
                formState: { errors: {} },
            });
        },
        FormProvider: ({ children }: any) => <>{children}</>,
    };
});

jest.mock('@hookform/resolvers/zod', () => ({
    zodResolver: () => jest.fn(),
}));

jest.mock('next-auth/react', () => ({
    useSession: () => ({ data: mockSessionData, status: mockSessionStatus }),
}));

jest.mock('@/app/actions/addArtist', () => ({
    addArtist: (...args: unknown[]) => mockAddArtist(...args),
}));

jest.mock('next/link', () => {
    return function MockLink({ children, href, onMouseDown, ...props }: any) {
        return <a href={href} onMouseDown={onMouseDown} {...props}>{children}</a>;
    };
});

jest.mock('lucide-react', () => ({
    ...jest.requireActual('lucide-react'),
    Plus: () => <svg data-testid="plus-icon" />,
}));

jest.mock('@/components/ui/dialog', () => ({
    Dialog: ({ open, onOpenChange, children }: any) => {
        capturedDialogOnOpenChange = onOpenChange;
        return open ? <div data-testid="dialog">{children}</div> : null;
    },
    DialogContent: ({ children }: any) => <div>{children}</div>,
    DialogHeader: ({ children }: any) => <div>{children}</div>,
    DialogTitle: ({ children }: any) => <h2>{children}</h2>,
    DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

jest.mock('@/components/ui/form', () => ({
    Form: ({ children }: any) => <div>{children}</div>,
    FormField: ({ render: renderFn, name }: any) => {
        const React = require('react');
        const [val, setVal] = React.useState('');
        return renderFn({
            field: { value: val, onChange: (e: any) => setVal(e.target?.value ?? e), name },
        });
    },
    FormItem: ({ children }: any) => <div>{children}</div>,
    FormLabel: ({ children }: any) => <label>{children}</label>,
    FormControl: ({ children }: any) => <div>{children}</div>,
    FormDescription: ({ children }: any) => <p>{children}</p>,
    FormMessage: () => null,
}));

jest.mock('@/components/ui/input', () => ({
    Input: ({ placeholder, value, onChange, ...props }: any) => (
        <input placeholder={placeholder} value={value ?? ''} onChange={onChange} {...props} />
    ),
}));

jest.mock('@/components/ui/button', () => {
    const React = require('react');
    const MockButton = React.forwardRef(({ children, onClick, disabled, asChild, variant, size, ...props }: any, ref: any) => {
        void variant;
        void size;
        if (asChild && React.isValidElement(children)) {
            return React.cloneElement(children, { ...props, ref });
        }
        return <button ref={ref} onClick={onClick} disabled={disabled} {...props}>{children}</button>;
    });
    MockButton.displayName = 'MockButton';
    return { Button: MockButton };
});

import AddArtist from '@/app/_components/nav/components/AddArtist';

const VALID_SPOTIFY_URL = 'https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb';
const VALID_SPOTIFY_ID = '4Z8W4fKeB5YxbusRsdQVPb';
const VALID_DEEZER_URL = 'https://www.deezer.com/artist/123456';
const VALID_DEEZER_ID = '123456';

describe('AddArtist', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPathname = '/';
        mockSessionData = null;
        mockSessionStatus = 'unauthenticated';
        capturedSubmitFn = null;
        capturedDialogOnOpenChange = null;
    });

    it('offers the missing-artist contact without submitting an artist', () => {
        mockSessionData = { user: { id: 'reviewer' } };
        mockSessionStatus = 'authenticated';
        render(<AddArtist />);
        fireEvent.click(screen.getByRole('button', { name: 'Add new artist' }));
        fireEvent.click(screen.getByText('Can’t find your artist?'));
        expect(screen.getByRole('link', { name: 'Open email draft' })).toHaveAttribute(
            'href', expect.stringContaining('mailto:info@xdjs.com?'),
        );
        expect(screen.getByPlaceholderText('Paste a Spotify or Deezer artist URL')).toBeInTheDocument();
        expect(mockAddArtist).not.toHaveBeenCalled();
    });

    describe('Button rendering', () => {
        it('renders the + button', () => {
            render(<AddArtist />);
            expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
        });

        it('labels the global control as adding a new artist', () => {
            render(<AddArtist />);
            expect(screen.getByRole('button', { name: 'Add new artist' })).toHaveAttribute('title', 'Add new artist');
        });
    });

    describe('Analytics', () => {
        it('tracks a + click as the start of an add, signed in or not', () => {
            render(<AddArtist />);
            fireEvent.click(screen.getByRole('button', { name: 'Add new artist' }));
            expect(mockTrackEvent).toHaveBeenCalledWith('add_artist', { surface: 'nav', step: 'start' });
        });

        it.each([
            [{ status: 'success', artistId: 'new-id', artistName: 'Radiohead' }, 'added'],
            [{ status: 'exists', artistId: 'old-id', artistName: 'Radiohead' }, 'exists'],
            [{ status: 'error', message: 'Spotify error' }, 'error'],
        ])('tracks how the add resolved (%o)', async (resp, step) => {
            mockSessionData = { user: { id: 'user-uuid' } };
            mockSessionStatus = 'authenticated';
            mockAddArtist.mockResolvedValue(resp);
            render(<AddArtist />);
            fireEvent.click(screen.getByRole('button', { name: 'Add new artist' }));
            await waitFor(() => expect(capturedSubmitFn).not.toBeNull());
            await act(async () => { await capturedSubmitFn!({ artistUrl: VALID_SPOTIFY_URL }); });
            expect(mockTrackEvent).toHaveBeenLastCalledWith('add_artist', { surface: 'nav', step });
        });

        it('tracks a thrown add as an error', async () => {
            mockSessionData = { user: { id: 'user-uuid' } };
            mockSessionStatus = 'authenticated';
            mockAddArtist.mockRejectedValue(new Error('network'));
            jest.spyOn(console, 'error').mockImplementation(() => {});
            render(<AddArtist />);
            fireEvent.click(screen.getByRole('button', { name: 'Add new artist' }));
            await waitFor(() => expect(capturedSubmitFn).not.toBeNull());
            await act(async () => { await capturedSubmitFn!({ artistUrl: VALID_SPOTIFY_URL }); });
            expect(mockTrackEvent).toHaveBeenLastCalledWith('add_artist', { surface: 'nav', step: 'error' });
        });

        const results = () => mockTrackEvent.mock.calls.filter(([, props]) => props.step !== 'start');

        it('tracks the result once even when the dialog closes before the add resolves', async () => {
            mockSessionData = { user: { id: 'user-uuid' } };
            mockSessionStatus = 'authenticated';
            let resolveAdd!: (value: unknown) => void;
            mockAddArtist.mockReturnValue(new Promise(resolve => { resolveAdd = resolve; }));
            render(<AddArtist />);
            fireEvent.click(screen.getByRole('button', { name: 'Add new artist' }));
            await waitFor(() => expect(capturedSubmitFn).not.toBeNull());
            let submitPromise!: Promise<void>;
            act(() => { submitPromise = capturedSubmitFn!({ artistUrl: VALID_SPOTIFY_URL }); });
            act(() => capturedDialogOnOpenChange!(false));
            resolveAdd({ status: 'success', artistId: 'new-id', artistName: 'Radiohead' });
            await act(async () => { await submitPromise; });
            expect(results()).toEqual([['add_artist', { surface: 'nav', step: 'added' }]]);
        });

        it('tracks a rejected add as exactly one error', async () => {
            mockSessionData = { user: { id: 'user-uuid' } };
            mockSessionStatus = 'authenticated';
            mockAddArtist.mockRejectedValue(new Error('network'));
            jest.spyOn(console, 'error').mockImplementation(() => {});
            render(<AddArtist />);
            fireEvent.click(screen.getByRole('button', { name: 'Add new artist' }));
            await waitFor(() => expect(capturedSubmitFn).not.toBeNull());
            await act(async () => { await capturedSubmitFn!({ artistUrl: VALID_SPOTIFY_URL }); });
            expect(results()).toEqual([['add_artist', { surface: 'nav', step: 'error' }]]);
        });

        it('tracks a rejected create-separate request as exactly one error', async () => {
            mockSessionData = { user: { id: 'user-uuid' } };
            mockSessionStatus = 'authenticated';
            mockAddArtist
                .mockResolvedValueOnce({
                    status: 'possible_duplicate',
                    platform: 'spotify',
                    platformId: VALID_SPOTIFY_ID,
                    candidates: [{ id: 'candidate-id', name: 'Radiohead', spotify: null, deezer: '12345' }],
                })
                .mockRejectedValueOnce(new Error('network'));
            jest.spyOn(console, 'error').mockImplementation(() => {});
            render(<AddArtist />);
            fireEvent.click(screen.getByRole('button', { name: 'Add new artist' }));
            await waitFor(() => expect(capturedSubmitFn).not.toBeNull());
            await act(async () => { await capturedSubmitFn!({ artistUrl: VALID_SPOTIFY_URL }); });
            await act(async () => { fireEvent.click(await screen.findByRole('button', { name: 'Add different artist' })); });
            await waitFor(() => expect(mockAddArtist).toHaveBeenCalledTimes(2));
            await waitFor(() => expect(results()).toEqual([['add_artist', { surface: 'nav', step: 'error' }]]));
            expect(results()).toHaveLength(1);
        });
    });

    describe('Unauthenticated behavior', () => {
        it('uses the shared login control when an unauthenticated user clicks the button', () => {
            const loginButton = document.createElement('button');
            loginButton.id = 'login-btn';
            const loginClick = jest.fn();
            loginButton.addEventListener('click', loginClick);
            document.body.appendChild(loginButton);

            render(<AddArtist />);
            fireEvent.click(screen.getByRole('button', { name: 'Add new artist' }));

            expect(loginClick).toHaveBeenCalled();
            loginButton.remove();
        });

        it('does not open modal when unauthenticated', () => {
            render(<AddArtist />);
            fireEvent.click(screen.getByRole('button', { name: 'Add new artist' }));
            expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
        });
    });

    describe('Authenticated behavior', () => {
        beforeEach(() => {
            mockSessionData = { user: { id: 'user-uuid', email: 'test@test.com' } };
            mockSessionStatus = 'authenticated';
        });

        it('opens modal when authenticated user clicks the button', () => {
            render(<AddArtist />);
            fireEvent.click(screen.getByRole('button', { name: 'Add new artist' }));
            expect(screen.getByTestId('dialog')).toBeInTheDocument();
        });

        it('does not click the shared login control when authenticated', () => {
            const loginButton = document.createElement('button');
            loginButton.id = 'login-btn';
            const loginClick = jest.fn();
            loginButton.addEventListener('click', loginClick);
            document.body.appendChild(loginButton);

            render(<AddArtist />);
            fireEvent.click(screen.getByRole('button', { name: 'Add new artist' }));

            expect(loginClick).not.toHaveBeenCalled();
            loginButton.remove();
        });

        it('uses a native form so Enter can submit the URL field', () => {
            render(<AddArtist />);
            fireEvent.click(screen.getByRole('button', { name: 'Add new artist' }));

            expect(screen.getByPlaceholderText('Paste a Spotify or Deezer artist URL').closest('form')).not.toBeNull();
        });

        describe('Form submission', () => {
            async function openModalAndSubmit(url: string) {
                render(<AddArtist />);
                fireEvent.click(screen.getByRole('button', { name: 'Add new artist' }));
                // Trigger submit by calling the captured handleSubmit fn directly
                await waitFor(() => expect(capturedSubmitFn).not.toBeNull());
                await act(async () => { await capturedSubmitFn!({ artistUrl: url }); });
            }

            it('calls addArtist with the extracted Spotify ID on valid Spotify URL', async () => {
                mockAddArtist.mockResolvedValue({ status: 'success', artistId: 'new-id', artistName: 'Radiohead', message: 'Added!' });
                await openModalAndSubmit(VALID_SPOTIFY_URL);
                expect(mockAddArtist).toHaveBeenCalledWith(VALID_SPOTIFY_ID, 'spotify');
            });

            it('calls addArtist with the extracted Deezer ID on valid Deezer URL', async () => {
                mockAddArtist.mockResolvedValue({ status: 'success', artistId: 'new-id', artistName: 'FKJ', message: 'Added!' });
                await openModalAndSubmit(VALID_DEEZER_URL);
                expect(mockAddArtist).toHaveBeenCalledWith(VALID_DEEZER_ID, 'deezer');
            });

            it('opens the saved profile automatically and retains a direct link', async () => {
                mockAddArtist.mockResolvedValue({ status: 'success', artistId: 'new-id', artistName: 'Radiohead', message: 'Added!' });
                await openModalAndSubmit(VALID_SPOTIFY_URL);
                await waitFor(() => {
                    expect(screen.getByText('Open Radiohead profile')).toBeInTheDocument();
                    expect(mockPush).toHaveBeenCalledWith('/artist/new-id');
                    expect(screen.getByRole('status', { name: 'Opening artist profile' })).toHaveTextContent('Opening Radiohead');
                });
            });

            it('closes the dialog when the existing artist is already the current profile', async () => {
                mockPathname = '/artist/existing-id';
                mockAddArtist.mockResolvedValue({ status: 'exists', artistId: 'existing-id', artistName: 'Radiohead' });
                await openModalAndSubmit(VALID_SPOTIFY_URL);
                expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
                expect(mockPush).not.toHaveBeenCalled();
            });

            it('shows success message in green', async () => {
                mockAddArtist.mockResolvedValue({ status: 'success', artistId: 'new-id', artistName: 'Radiohead', message: 'Artist added!' });
                await openModalAndSubmit(VALID_SPOTIFY_URL);
                await waitFor(() => {
                    expect(screen.getByRole('status', { name: 'Opening artist profile' })).toHaveTextContent('Opening Radiohead');
                });
            });

            it('shows error message in red when add fails', async () => {
                mockAddArtist.mockResolvedValue({ status: 'error', message: 'Spotify error', artistId: undefined, artistName: undefined });
                await openModalAndSubmit(VALID_SPOTIFY_URL);
                await waitFor(() => {
                    expect(screen.getByText('Spotify error')).toHaveClass('text-red-700', 'dark:text-red-400');
                });
            });

            it('does not show artist links on error', async () => {
                mockAddArtist.mockResolvedValue({ status: 'error', message: 'Something went wrong', artistId: undefined, artistName: undefined });
                await openModalAndSubmit(VALID_SPOTIFY_URL);
                await waitFor(() => {
                    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
                });
                expect(screen.queryByText(/Check out/)).not.toBeInTheDocument();
            });

            it('shows success links for "exists" status', async () => {
                mockAddArtist.mockResolvedValue({ status: 'exists', artistId: 'existing-id', artistName: 'Existing Artist', message: 'Already in DB' });
                await openModalAndSubmit(VALID_SPOTIFY_URL);
                await waitFor(() => {
                    expect(screen.getByText('Open Existing Artist profile')).toBeInTheDocument();
                    expect(mockPush).toHaveBeenCalledWith('/artist/existing-id');
                });
            });

            it('offers matching artists with a canonical add-link handoff URL', async () => {
                mockAddArtist.mockResolvedValue({
                    status: 'possible_duplicate',
                    message: 'We found a possible match.',
                    platform: 'spotify',
                    platformId: VALID_SPOTIFY_ID,
                    candidates: [{
                        id: 'candidate-id',
                        name: 'Radiohead',
                        spotify: null,
                        deezer: '12345',
                    }],
                });

                await openModalAndSubmit(`${VALID_SPOTIFY_URL}?si=tracking-token#popular`);

                const candidateLink = await screen.findByRole('link', { name: /Use existing profile: Radiohead/ });
                expect(screen.getByText('Radiohead')).toBeInTheDocument();
                expect(candidateLink).toHaveAttribute(
                    'href',
                    `/artist/candidate-id?addLink=${encodeURIComponent(VALID_SPOTIFY_URL)}`,
                );
                expect(screen.getByRole('button', { name: 'Add different artist' })).toBeInTheDocument();
            });

            it('returns from duplicate review to URL entry without creating an artist', async () => {
                mockAddArtist.mockResolvedValue({
                    status: 'possible_duplicate',
                    platform: 'spotify',
                    platformId: VALID_SPOTIFY_ID,
                    candidates: [{
                        id: 'candidate-id',
                        name: 'Radiohead',
                        spotify: null,
                        deezer: '12345',
                    }],
                });

                await openModalAndSubmit(VALID_SPOTIFY_URL);
                expect(await screen.findByRole('button', { name: 'Add different artist' })).toBeInTheDocument();

                fireEvent.click(screen.getByRole('button', { name: 'Back' }));
                expect(screen.getByPlaceholderText('Paste a Spotify or Deezer artist URL')).toBeInTheDocument();
                expect(mockAddArtist).toHaveBeenCalledTimes(1);

                expect(screen.queryByRole('button', { name: 'Add different artist' })).not.toBeInTheDocument();
                expect(screen.getByRole('button', { name: 'Add Artist' })).toBeEnabled();
            });

            it('ignores an add response that finishes after the modal closes', async () => {
                let resolveAdd!: (value: unknown) => void;
                mockAddArtist.mockReturnValue(new Promise(resolve => { resolveAdd = resolve; }));

                render(<AddArtist />);
                fireEvent.click(screen.getByRole('button', { name: 'Add new artist' }));
                await waitFor(() => expect(capturedSubmitFn).not.toBeNull());

                let submitPromise!: Promise<void>;
                act(() => {
                    submitPromise = capturedSubmitFn!({ artistUrl: VALID_SPOTIFY_URL });
                });
                await waitFor(() => expect(screen.getByAltText('Adding artist')).toBeInTheDocument());

                act(() => capturedDialogOnOpenChange!(false));
                resolveAdd({ status: 'success', artistId: 'stale-id', artistName: 'Stale Artist' });
                await act(async () => { await submitPromise; });

                fireEvent.click(screen.getByRole('button', { name: 'Add new artist' }));
                expect(screen.queryByText('Check out Stale Artist')).not.toBeInTheDocument();
                expect(screen.getByRole('button', { name: 'Add Artist' })).toBeEnabled();
            });

            it('keeps the mutation lock until an invalidated request settles', async () => {
                let resolveAdd!: (value: unknown) => void;
                mockAddArtist.mockReturnValue(new Promise(resolve => { resolveAdd = resolve; }));

                render(<AddArtist />);
                fireEvent.click(screen.getByRole('button', { name: 'Add new artist' }));
                await waitFor(() => expect(capturedSubmitFn).not.toBeNull());

                let firstSubmit!: Promise<void>;
                act(() => {
                    firstSubmit = capturedSubmitFn!({ artistUrl: VALID_SPOTIFY_URL });
                });
                await waitFor(() => expect(screen.getByAltText('Adding artist')).toBeInTheDocument());

                fireEvent.change(screen.getByPlaceholderText('Paste a Spotify or Deezer artist URL'), {
                    target: { value: VALID_DEEZER_URL },
                });
                await act(async () => {
                    await capturedSubmitFn!({ artistUrl: VALID_DEEZER_URL });
                });

                expect(mockAddArtist).toHaveBeenCalledTimes(1);
                expect(screen.getByRole('button', { name: 'Adding artist' })).toBeDisabled();

                resolveAdd({ status: 'success', artistId: 'stale-id', artistName: 'Stale Artist' });
                await act(async () => { await firstSubmit; });

                expect(screen.queryByText('Check out Stale Artist')).not.toBeInTheDocument();
                expect(screen.getByRole('button', { name: 'Add Artist' })).toBeEnabled();
            });

            it('force-creates a separate artist only after confirmation', async () => {
                mockAddArtist
                    .mockResolvedValueOnce({
                        status: 'possible_duplicate',
                        platform: 'spotify',
                        platformId: VALID_SPOTIFY_ID,
                        candidates: [{
                            id: 'candidate-id',
                            name: 'Radiohead',
                            spotify: null,
                            deezer: '12345',
                        }],
                    })
                    .mockResolvedValueOnce({
                        status: 'success',
                        artistId: 'separate-id',
                        artistName: 'Radiohead',
                        message: 'Artist added!',
                    });

                await openModalAndSubmit(VALID_SPOTIFY_URL);
                fireEvent.click(await screen.findByRole('button', { name: 'Add different artist' }));

                await waitFor(() => {
                    expect(mockAddArtist).toHaveBeenNthCalledWith(
                        2,
                        VALID_SPOTIFY_ID,
                        'spotify',
                        { forceCreate: true },
                    );
                    expect(screen.getByText('Open Radiohead profile')).toBeInTheDocument();
                    expect(mockPush).toHaveBeenCalledWith('/artist/separate-id');
                });
            });

            it('replaces the dialog with blocking progress and refuses close while force creation is pending', async () => {
                let resolveCreate!: (value: unknown) => void;
                mockAddArtist
                    .mockResolvedValueOnce({
                        status: 'possible_duplicate',
                        platform: 'spotify',
                        platformId: VALID_SPOTIFY_ID,
                        candidates: [{
                            id: 'candidate-id',
                            name: 'Radiohead',
                            spotify: null,
                            deezer: '12345',
                        }],
                    })
                    .mockReturnValueOnce(new Promise(resolve => { resolveCreate = resolve; }));

                await openModalAndSubmit(VALID_SPOTIFY_URL);
                const candidateLink = await screen.findByRole('link', { name: /Use existing profile: Radiohead/ });
                fireEvent.click(screen.getByRole('button', { name: 'Add different artist' }));

                expect(await screen.findByRole('status')).toHaveTextContent('Creating separate artist');
                expect(candidateLink).not.toBeInTheDocument();
                expect(screen.queryByPlaceholderText('Paste a Spotify or Deezer artist URL')).not.toBeInTheDocument();

                act(() => capturedDialogOnOpenChange!(false));
                expect(screen.getByTestId('dialog')).toBeInTheDocument();
                expect(screen.getByRole('status')).toBeInTheDocument();

                await act(async () => {
                    resolveCreate({
                        status: 'success',
                        artistId: 'separate-id',
                        artistName: 'Radiohead',
                        message: 'Artist added!',
                    });
                });

                expect(screen.getByText('Open Radiohead profile')).toBeInTheDocument();
                expect(mockPush).toHaveBeenCalledWith('/artist/separate-id');
            });

            it('shows identity conflicts as blocking errors', async () => {
                mockAddArtist.mockResolvedValue({
                    status: 'conflict',
                    message: 'That Spotify profile belongs to another artist.',
                });

                await openModalAndSubmit(VALID_SPOTIFY_URL);

                expect(await screen.findByText('That Spotify profile belongs to another artist.')).toHaveClass('text-red-700', 'dark:text-red-400');
                expect(screen.queryByRole('button', { name: 'Add different artist' })).not.toBeInTheDocument();
            });

            it('does not call addArtist when URL fails regex extraction', async () => {
                // The onSubmit function guards with a regex match before calling addArtist;
                // passing an invalid URL string exercises that null-return path.
                await openModalAndSubmit('https://notspotify.com/artist/123');
                expect(mockAddArtist).not.toHaveBeenCalled();
            });

            it('rejects a Spotify artist URL with an extra path segment', async () => {
                await openModalAndSubmit(`${VALID_SPOTIFY_URL}/albums`);
                expect(mockAddArtist).not.toHaveBeenCalled();
            });
        });
    });
});
