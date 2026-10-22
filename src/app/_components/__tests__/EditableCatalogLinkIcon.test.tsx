import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EditableLinkIcon from '../EditableLinkIcon';
import { EditModeContext } from '../EditModeContext';
import { requestArtistLinkEdit } from '@/lib/artistLinks/requestArtistLinkEdit';
const refresh = jest.fn();
const toast = jest.fn();
const track = jest.fn();
jest.mock('@/lib/artistLinks/requestArtistLinkEdit', () => ({ requestArtistLinkEdit: jest.fn() }));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
jest.mock('@/lib/analytics/trackEvent', () => ({ trackEvent: (...args: unknown[]) => track(...args) }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
const request = requestArtistLinkEdit as jest.Mock;
const props = { artistId: 'artist', siteName: 'deezer', href: 'https://www.deezer.com/artist/87797542', iconSrc: '/deezer.svg', label: 'Deezer' };
function show(href = props.href) {
  return render(<EditModeContext.Provider value={{ canEdit: true, isEditing: true, toggle: jest.fn(), refreshProfile: refresh }}><EditableLinkIcon {...props} href={href} /></EditModeContext.Provider>);
}
beforeEach(() => { jest.clearAllMocks(); request.mockResolvedValue({ ok: true, json: async () => ({ status: 'ok', success: true }) }); });
it('sends the displayed ID and refreshes only after a successful authenticated clear', async () => {
  show(); fireEvent.click(screen.getByRole('button', { name: 'Remove Deezer' }));
  await waitFor(() => expect(request).toHaveBeenCalledWith('directEditLink', { artistId: 'artist', action: 'clear', siteName: 'deezer', expectedValue: '87797542' }));
  await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  expect(track).toHaveBeenCalledWith('profile_edit', { action: 'link_remove', target: 'deezer' });
});
it('shows stale-identity refusal without success analytics or hiding the current link', async () => {
  request.mockResolvedValue({ ok: false, status: 409, json: async () => ({ status: 'error', error: 'Reload the changed link.' }) });
  show(); fireEvent.click(screen.getByRole('button', { name: 'Remove Deezer' }));
  await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'Reload the changed link.', variant: 'destructive' })));
  expect(refresh).not.toHaveBeenCalled(); expect(track).not.toHaveBeenCalled();
  expect(screen.getByRole('link')).toHaveAttribute('href', props.href);
});
it('fails closed on a malformed catalog URL without calling either endpoint', async () => {
  show('https://evil.test/artist/87797542'); fireEvent.click(screen.getByRole('button', { name: 'Remove Deezer' }));
  await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ description: expect.stringContaining('Reload') })));
  expect(request).not.toHaveBeenCalled(); expect(track).not.toHaveBeenCalled();
});
