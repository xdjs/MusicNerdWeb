import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EditModeContext } from '@/app/_components/EditModeContext';
import HeroSection from '@/app/artist/[id]/_components/HeroSection';
import VaultSection from '@/app/artist/[id]/_components/VaultSection';
import { getArtistBioVersions } from '@/app/actions/dashboardActions';

let mockPinned = false;
jest.mock('@/app/actions/dashboardActions', () => ({
  getArtistBioVersions: jest.fn(async () => ({ success: true, versions: [{ id: 'v1', artistId: 'a1', bioText: 'Selected saved version', isPinned: mockPinned, createdAt: '2026-01-01' }] })),
  pinBioVersionAction: jest.fn(async () => { mockPinned = true; return { success: true }; }),
  unpinBioAction: jest.fn(async () => { mockPinned = false; return { success: true }; }),
}));
jest.mock('@/app/artist/[id]/_components/VaultManager', () => () => null);
jest.mock('@/app/artist/[id]/_components/ArtistInterviews', () => () => null);
jest.mock('@/app/artist/[id]/_components/SuggestedLinkReview', () => () => null);
jest.mock('@/app/artist/[id]/_components/ResearchDiscoveryReview', () => () => null);

function Profile() {
  const [revision, setRevision] = useState(0);
  return <EditModeContext.Provider value={{ isEditing: true, canEdit: true, toggle: jest.fn(), revision, refreshProfile: () => setRevision(v => v + 1) }}>
    <button onClick={() => setRevision(v => v + 1)}>Refresh saved profile</button>
    <HeroSection artistId="a1" artistName="Test" imageUrl="/portrait.jpg" hasPortrait bio="Initial saved bio" />
    <VaultSection artistId="a1" isClaimed approvedSources={[]} pendingSources={[]} />
  </EditModeContext.Provider>;
}

it('pinning in Lore Bios updates the separate hero editor and its Discard baseline', async () => {
  jest.clearAllMocks();
  mockPinned = false;
  render(<Profile />);
  const draft = screen.getByRole('textbox', { name: 'Artist biography' });
  fireEvent.change(draft, { target: { value: 'Unfinished local wording' } });
  fireEvent.click(screen.getByRole('button', { name: 'Refresh saved profile' }));
  await waitFor(() => expect(getArtistBioVersions).toHaveBeenCalledTimes(4));
  expect(draft).toHaveValue('Unfinished local wording');
  fireEvent.mouseDown(screen.getByRole('tab', { name: 'Bios' }), { button: 0, ctrlKey: false });
  fireEvent.click(screen.getByText(/show version history/i));
  fireEvent.click(await screen.findByRole('button', { name: /^pin$/i }));
  await waitFor(() => expect(draft).toHaveValue('Selected saved version'));
  expect(draft).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Unpin to edit' }));
  await waitFor(() => expect(draft).not.toBeDisabled());
  fireEvent.change(draft, { target: { value: 'New unsaved wording' } });
  fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
  expect(draft).toHaveValue('Selected saved version');
});
