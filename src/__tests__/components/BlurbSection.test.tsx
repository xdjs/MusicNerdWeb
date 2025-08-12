/// <reference types="@testing-library/jest-dom" />
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BlurbSection from '@/app/artist/[id]/_components/BlurbSection';
import { EditModeContext } from '@/app/_components/EditModeContext';

// Use the global fetch mock that's already set up in jest.setup.ts
const mockFetch = global.fetch as jest.Mock;

describe('BlurbSection', () => {
    const defaultProps = {
        artistName: 'Test Artist',
        artistId: 'test-artist-id'
    };

    const longContent = 'This is a very long content that should be more than 200 characters to trigger the Read More functionality. It needs to be long enough to test the character limit check. This should definitely be over 200 characters now.';

    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch.mockClear();
    });

    describe('Basic Rendering', () => {
        it('renders loading state initially', () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ bio: 'Test bio content' })
            });

            render(<BlurbSection {...defaultProps} />);
            
            expect(screen.getByText('Loading summary...')).toBeInTheDocument();
        });

        it('displays AI-generated content when loaded', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ bio: 'AI generated bio content' })
            });

            render(<BlurbSection {...defaultProps} />);
            
            await waitFor(() => {
                expect(screen.getByText('AI generated bio content')).toBeInTheDocument();
            });
        });

        it('displays error message when API fails', async () => {
            mockFetch.mockRejectedValueOnce(new Error('API Error'));

            render(<BlurbSection {...defaultProps} />);
            
            await waitFor(() => {
                expect(screen.getByText('Failed to load summary.')).toBeInTheDocument();
            });
        });


    });

    describe('Read More Functionality', () => {
        it('shows Read More button for long content', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ bio: longContent })
            });

            render(<BlurbSection {...defaultProps} />);
            
            await waitFor(() => {
                expect(screen.getByText('Read More')).toBeInTheDocument();
            });
        });

        it('does not show Read More button for short content', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ bio: 'Short content' })
            });

            render(<BlurbSection {...defaultProps} />);
            
            await waitFor(() => {
                expect(screen.queryByText('Read More')).not.toBeInTheDocument();
            });
        });

        it('opens modal when Read More is clicked', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ bio: longContent })
            });

            render(<BlurbSection {...defaultProps} />);
            
            await waitFor(() => {
                expect(screen.getByText('Read More')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Read More'));
            
            expect(screen.getByText('Show less')).toBeInTheDocument();
        });

        it('closes modal when Show less is clicked', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ bio: longContent })
            });

            render(<BlurbSection {...defaultProps} />);
            
            await waitFor(() => {
                expect(screen.getByText('Read More')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Read More'));
            expect(screen.getByText('Show less')).toBeInTheDocument();

            fireEvent.click(screen.getByText('Show less'));
            expect(screen.queryByText('Show less')).not.toBeInTheDocument();
        });
    });

    describe('API Integration', () => {
        it('calls the correct API endpoint', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ bio: 'Test bio' })
            });

            render(<BlurbSection {...defaultProps} />);
            
            await waitFor(() => {
                expect(mockFetch).toHaveBeenCalledWith('/api/artistBio/test-artist-id');
            });
        });

        it('handles non-ok response', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500
            });

            render(<BlurbSection {...defaultProps} />);
            
            await waitFor(() => {
                expect(screen.getByText('Failed to load summary.')).toBeInTheDocument();
            });
        });
    });

    describe('Regenerate Functionality', () => {
        const TestWrapper = ({ children }: { children: React.ReactNode }) => (
            <EditModeContext.Provider value={{ isEditing: false, canEdit: true, toggle: jest.fn() }}>
                {children}
            </EditModeContext.Provider>
        );

        it('does not show regenerate button in non-edit mode', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ bio: 'Test bio' })
            });

            render(
                <TestWrapper>
                    <BlurbSection {...defaultProps} />
                </TestWrapper>
            );
            
            await waitFor(() => {
                expect(screen.queryByText('Regenerate')).not.toBeInTheDocument();
            });
        });

        it('calls regenerate API when regenerate button is clicked in edit mode', async () => {
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ bio: 'Original bio' })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ bio: 'Regenerated bio' })
                });

            // Use edit mode wrapper to show Regenerate button
            const EditModeWrapper = ({ children }: { children: React.ReactNode }) => (
                <EditModeContext.Provider value={{ isEditing: true, canEdit: true, toggle: jest.fn() }}>
                    {children}
                </EditModeContext.Provider>
            );

            render(
                <EditModeWrapper>
                    <BlurbSection {...defaultProps} />
                </EditModeWrapper>
            );
            
            await waitFor(() => {
                expect(screen.getByText('Regenerate')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Regenerate'));

            await waitFor(() => {
                expect(mockFetch).toHaveBeenCalledWith('/api/artistBio/test-artist-id', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ regenerate: true }),
                });
            });
        });

        it('updates bio content after successful regeneration in edit mode', async () => {
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ bio: 'Original bio' })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ bio: 'Regenerated bio' })
                });

            // Use edit mode wrapper to show Regenerate button
            const EditModeWrapper = ({ children }: { children: React.ReactNode }) => (
                <EditModeContext.Provider value={{ isEditing: true, canEdit: true, toggle: jest.fn() }}>
                    {children}
                </EditModeContext.Provider>
            );

            render(
                <EditModeWrapper>
                    <BlurbSection {...defaultProps} />
                </EditModeWrapper>
            );
            
            await waitFor(() => {
                const textarea = screen.getByPlaceholderText('Enter artist bio...') as HTMLTextAreaElement;
                expect(textarea.value).toBe('Original bio');
            });

            fireEvent.click(screen.getByText('Regenerate'));

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText('Enter artist bio...') as HTMLTextAreaElement;
                expect(textarea.value).toBe('Regenerated bio');
            });
        });

        it('handles regenerate API error in edit mode', async () => {
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ bio: 'Original bio' })
                })
                .mockResolvedValueOnce({
                    ok: false,
                    json: async () => ({ message: 'Regeneration failed' })
                });

            // Use edit mode wrapper to show Regenerate button
            const EditModeWrapper = ({ children }: { children: React.ReactNode }) => (
                <EditModeContext.Provider value={{ isEditing: true, canEdit: true, toggle: jest.fn() }}>
                    {children}
                </EditModeContext.Provider>
            );

            render(
                <EditModeWrapper>
                    <BlurbSection {...defaultProps} />
                </EditModeWrapper>
            );
            
            await waitFor(() => {
                expect(screen.getByText('Regenerate')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Regenerate'));

            // The original bio should still be displayed in textarea
            await waitFor(() => {
                const textarea = screen.getByPlaceholderText('Enter artist bio...') as HTMLTextAreaElement;
                expect(textarea.value).toBe('Original bio');
            });
        });

        it('discard restores original bio after regeneration', async () => {
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ bio: 'Original bio' })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ bio: 'Regenerated bio' })
                });

            // Use edit mode wrapper to show Discard button
            const EditModeWrapper = ({ children }: { children: React.ReactNode }) => (
                <EditModeContext.Provider value={{ isEditing: true, canEdit: true, toggle: jest.fn() }}>
                    {children}
                </EditModeContext.Provider>
            );

            render(
                <EditModeWrapper>
                    <BlurbSection {...defaultProps} />
                </EditModeWrapper>
            );
            
            // Wait for initial bio to load in textarea
            await waitFor(() => {
                const textarea = screen.getByPlaceholderText('Enter artist bio...') as HTMLTextAreaElement;
                expect(textarea.value).toBe('Original bio');
            });

            // Click regenerate
            fireEvent.click(screen.getByText('Regenerate'));

            // Wait for regenerated bio to appear in textarea
            await waitFor(() => {
                const textarea = screen.getByPlaceholderText('Enter artist bio...') as HTMLTextAreaElement;
                expect(textarea.value).toBe('Regenerated bio');
            });

            // Click discard - should restore original bio
            fireEvent.click(screen.getByText('Discard'));

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText('Enter artist bio...') as HTMLTextAreaElement;
                expect(textarea.value).toBe('Original bio');
            });
        });

        it('save updates original bio state', async () => {
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ bio: 'Original bio' })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ message: 'Bio updated' })
                });

            // Use edit mode wrapper to show Save button
            const EditModeWrapper = ({ children }: { children: React.ReactNode }) => (
                <EditModeContext.Provider value={{ isEditing: true, canEdit: true, toggle: jest.fn() }}>
                    {children}
                </EditModeContext.Provider>
            );

            render(
                <EditModeWrapper>
                    <BlurbSection {...defaultProps} />
                </EditModeWrapper>
            );
            
            // Wait for initial bio to load in textarea
            await waitFor(() => {
                const textarea = screen.getByPlaceholderText('Enter artist bio...') as HTMLTextAreaElement;
                expect(textarea.value).toBe('Original bio');
            });

            // Edit the bio text
            const textarea = screen.getByPlaceholderText('Enter artist bio...') as HTMLTextAreaElement;
            fireEvent.change(textarea, { target: { value: 'Edited bio content' } });

            // Save the changes
            fireEvent.click(screen.getByText('Save'));

            // Wait for save to complete
            await waitFor(() => {
                expect(mockFetch).toHaveBeenCalledWith('/api/artistBio/test-artist-id', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ bio: 'Edited bio content' }),
                });
            });

            // Wait for the save to complete and state to update
            await waitFor(() => {
                const saveButton = screen.getByText('Save');
                expect(saveButton).toBeDisabled(); // Save button should be disabled after saving
            });

            // Now regenerate to test that the saved bio becomes the new "original"
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ bio: 'New regenerated bio' })
            });

            fireEvent.click(screen.getByText('Regenerate'));

            // Wait for regenerated bio to appear in textarea
            await waitFor(() => {
                const textarea = screen.getByPlaceholderText('Enter artist bio...') as HTMLTextAreaElement;
                expect(textarea.value).toBe('New regenerated bio');
            });

            // Click discard - should restore the saved bio (now the "original")
            fireEvent.click(screen.getByText('Discard'));

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText('Enter artist bio...') as HTMLTextAreaElement;
                expect(textarea.value).toBe('Edited bio content');
            });
        });
    });
}); 