/// <reference types="@testing-library/jest-dom" />
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import EditablePlatformLink from '@/app/_components/EditablePlatformLink';
import { EditModeContext } from '@/app/_components/EditModeContext';
import { requestArtistLinkEdit } from '@/lib/artistLinks/requestArtistLinkEdit';
const refresh = jest.fn();
const toast = jest.fn();
const track = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
jest.mock('@/lib/analytics/trackEvent', () => ({ trackEvent: (...args: unknown[]) => track(...args) }));
jest.mock('@/lib/artistLinks/requestArtistLinkEdit', () => ({ requestArtistLinkEdit: jest.fn() }));
const request = requestArtistLinkEdit as jest.Mock;
const linkProps = { link: 'https://open.spotify.com/artist/0y9DJxRh3j84i13hctQcFx', descriptor: 'Spotify', image: '/spotify.svg', siteName: 'spotify', artistId: 'artist-123' };
function show(editing = true) { return render(<EditModeContext.Provider value={{ isEditing: editing, toggle: jest.fn(), canEdit: true }}><EditablePlatformLink {...linkProps} /></EditModeContext.Provider>); }
beforeEach(() => { jest.clearAllMocks(); request.mockResolvedValue({ ok: true }); jest.spyOn(window, 'confirm').mockReturnValue(true); });
afterEach(() => jest.restoreAllMocks());
it('does not show trash icon when not in edit mode', () => { show(false); expect(screen.queryByRole('button')).not.toBeInTheDocument(); });
it('sends the displayed catalog identity to the authenticated contributor endpoint', async () => {
  show(); fireEvent.click(screen.getByRole('button'));
  await waitFor(() => expect(request).toHaveBeenCalledWith('removeArtistData', { artistId: 'artist-123', siteName: 'spotify', expectedValue: '0y9DJxRh3j84i13hctQcFx' }));
  await waitFor(() => expect(refresh).toHaveBeenCalled());
  expect(track).toHaveBeenCalledWith('profile_edit', { action: 'link_remove', target: 'spotify' });
});
it('does not send a canceled removal', () => { jest.mocked(window.confirm).mockReturnValue(false); show(); fireEvent.click(screen.getByRole('button')); expect(request).not.toHaveBeenCalled(); });
it('shows API error envelope on stale identity, without success analytics', async () => {
  request.mockResolvedValue({ ok: false, json: async () => ({ status: 'error', error: 'Reload before disconnecting.' }) });
  show(); fireEvent.click(screen.getByRole('button'));
  await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'Reload before disconnecting.' })));
  expect(track).not.toHaveBeenCalled();
});
it('shows token/transport failure instead of silently treating it as removal', async () => {
  request.mockRejectedValue(new Error('Please sign in again to edit artist links.'));
  show(); fireEvent.click(screen.getByRole('button'));
  await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'Please sign in again to edit artist links.' })));
  expect(track).not.toHaveBeenCalled();
});
