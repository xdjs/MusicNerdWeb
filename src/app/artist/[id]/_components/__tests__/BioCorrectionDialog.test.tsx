import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BioCorrectionDialog from '../BioCorrectionDialog';
import { usePrivy } from '@privy-io/react-auth';
jest.mock('@privy-io/react-auth', () => ({ usePrivy: jest.fn() }));
const login = jest.fn();
beforeEach(() => { jest.clearAllMocks(); jest.mocked(usePrivy).mockReturnValue({ ready: true, authenticated: true, login } as never); global.fetch = jest.fn(); });
it('opens from quiet action and submits the exact displayed bio', async () => {
 jest.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ success: true }) } as Response);
 render(<BioCorrectionDialog artistId="artist" artistName="Dutchyyy" bio="A published bio" portrait/>);
 fireEvent.click(screen.getByRole('button', { name: 'Suggest a correction' }));
 fireEvent.change(screen.getByLabelText('What needs fixing?'), { target: { value: 'wrong_artist' } });
 fireEvent.click(screen.getByRole('button', { name: 'Send suggestion' }));
 await screen.findByRole('status');
 expect(fetch).toHaveBeenCalledWith('/api/artist/artist/bio-corrections', expect.objectContaining({ body: JSON.stringify({ reason: 'wrong_artist', details: '', sourceUrl: '', expectedBio: 'A published bio' }) }));
});
it('lets anonymous visitors inspect form but requires login to send', () => {
 jest.mocked(usePrivy).mockReturnValue({ ready: true, authenticated: false, login } as never);
 render(<BioCorrectionDialog artistId="artist" artistName="Dutchyyy" bio="bio"/>);
 fireEvent.click(screen.getByRole('button', { name: 'Suggest a correction' }));
 fireEvent.click(screen.getByRole('button', { name: 'Sign in to send' }));
 expect(login).toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
});
it('shows a stale-bio error without claiming success', async () => {
 jest.mocked(fetch).mockResolvedValue({ ok: false, json: async () => ({ error: 'Reload the profile' }) } as Response);
 render(<BioCorrectionDialog artistId="artist" artistName="Dutchyyy" bio="bio"/>);
 fireEvent.click(screen.getByRole('button', { name: 'Suggest a correction' }));
 fireEvent.click(screen.getByRole('button', { name: 'Send suggestion' }));
 await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Reload the profile'));
 expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
