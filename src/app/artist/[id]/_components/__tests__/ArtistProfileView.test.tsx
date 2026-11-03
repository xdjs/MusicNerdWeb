// @ts-nocheck
import React from 'react';
import { render, screen } from '@testing-library/react';
import ArtistProfileView from '../ArtistProfileView';
import { useArtistViewer } from '@/hooks/useArtistViewer';
import { useArtistEditor } from '@/hooks/useArtistEditor';
import { useClaimantOnboarding } from '@/hooks/useClaimantOnboarding';
import { mockMusicNerdUser } from '@/test/__mocks__/useMusicNerdUser';

jest.mock('@/hooks/useArtistViewer', () => ({ useArtistViewer: jest.fn() }));
jest.mock('@/hooks/useArtistEditor', () => ({ useArtistEditor: jest.fn() }));
jest.mock('@/hooks/useClaimantOnboarding', () => ({ useClaimantOnboarding: jest.fn() }));
const content = jest.fn();
jest.mock('../ArtistProfileContent', () => function ArtistProfileContent(props) { content(props); return <main>{props.interviewAction}</main>; });
jest.mock('@/app/_components/EditModeContext', () => ({ EditModeProvider: ({ canEdit, children }) => <div data-testid="edit-mode" data-can-edit={String(canEdit)}>{children}</div> }));
jest.mock('../DirectoryDiscoveryObserver', () => function DirectoryDiscoveryObserver({ initialRevision }) { return <i data-testid="observer" data-revision={initialRevision} />; });
jest.mock('../onboarding/OnboardingGate', () => function OnboardingGate({ state, children }) { return <section data-testid="gate" data-complete={String(state.complete)}>{children}</section>; });
jest.mock('../onboarding/ProfileTour', () => function ProfileTour() { return <i data-testid="tour" />; });
jest.mock('../onboarding/ProfileTourPreview', () => function ProfileTourPreview() { return <i data-testid="tour-preview" />; });
jest.mock('../onboarding/ApiInterview', () => function ApiInterview() { return <button>Interview</button>; });

const artist = { id: 'artist-1', name: 'Bio Ritmo', bio: null };
const publicContent = { artist, isClaimed: true, isPending: false, approvedSources: [{ id: 'public' }], imageUrl: '/a.jpg', platformImage: null, artistLinks: [], urlMapList: [], latest: null };
const viewAs = (user, claimStatus = null, addedByCaller = false) => jest.mocked(useArtistViewer).mockReturnValue({ user: user && { ...mockMusicNerdUser, ...user }, claimStatus, addedByCaller });
const renderView = (props = {}) => render(<ArtistProfileView content={publicContent} tourPreview={false} hasSupportLinks={false} researchLinks={['bandcamp']} watchDirectory={null} {...props} />);
const lastContent = () => content.mock.calls.at(-1)[0];

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useArtistEditor).mockReturnValue(null);
  jest.mocked(useClaimantOnboarding).mockReturnValue(null);
});

it('shows a visitor the public page without edit rights or private reads', () => {
  viewAs(null);
  renderView();
  expect(screen.getByTestId('edit-mode')).toHaveAttribute('data-can-edit', 'false');
  expect(useArtistEditor).toHaveBeenCalledWith('artist-1', false);
  expect(useClaimantOnboarding).toHaveBeenCalledWith('artist-1', false);
  expect(lastContent()).toMatchObject({ canEdit: false, isClaimedByUser: false, isPendingByUser: false, autoApprove: false, pendingSources: [], approvedSources: [{ id: 'public' }] });
});

it("gives an admin edit mode with the editor view's About and sources", () => {
  viewAs({ isAdmin: true });
  jest.mocked(useArtistEditor).mockReturnValue({ bio: 'Stored About', approvedSources: [{ id: 'all' }], pendingSources: [{ id: 'pending' }] });
  renderView({ content: { ...publicContent, isClaimed: false } });
  expect(screen.getByTestId('edit-mode')).toHaveAttribute('data-can-edit', 'true');
  expect(useArtistEditor).toHaveBeenCalledWith('artist-1', true);
  expect(lastContent()).toMatchObject({ canEdit: true, isClaimedByUser: false, autoApprove: true, artist: { bio: 'Stored About' }, approvedSources: [{ id: 'all' }], pendingSources: [{ id: 'pending' }] });
});

it('auto-approves a whitelisted account without giving it edit mode', () => {
  viewAs({ isWhiteListed: true });
  renderView();
  expect(lastContent()).toMatchObject({ canEdit: false, autoApprove: true });
});

it('knows the pending claimant from their own claim', () => {
  viewAs({}, 'pending');
  renderView({ content: { ...publicContent, isClaimed: false, isPending: true } });
  expect(lastContent()).toMatchObject({ isPendingByUser: true, isClaimedByUser: false, canEdit: false });
});

it("gives the approved claimant edit mode, their build and, once it's done, the tour and interview", () => {
  viewAs({}, 'approved');
  jest.mocked(useClaimantOnboarding).mockReturnValue({ complete: true, currentStep: null, steps: {} });
  renderView();
  expect(useClaimantOnboarding).toHaveBeenCalledWith('artist-1', true);
  expect(lastContent()).toMatchObject({ canEdit: true, isClaimedByUser: true, researching: false });
  expect(screen.getByTestId('gate')).toHaveAttribute('data-complete', 'true');
  expect(screen.getByTestId('tour')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Interview' })).toBeVisible();
});

it('tells the page research is running while the build is unfinished', () => {
  viewAs({}, 'approved');
  jest.mocked(useClaimantOnboarding).mockReturnValue({ complete: false, currentStep: 'vault', steps: {} });
  renderView();
  expect(lastContent()).toMatchObject({ researching: true, interviewAction: null });
  expect(screen.queryByTestId('tour')).not.toBeInTheDocument();
});

it.each([
  ['the adder', {}, true, true],
  ['an admin', { isAdmin: true }, false, true],
  ['another account', {}, false, false],
])("watches a new artist's directory for %s", (_label, user, addedByCaller, watched) => {
  viewAs(user, null, addedByCaller);
  renderView({ watchDirectory: 'rev-1', content: { ...publicContent, isClaimed: false } });
  if (watched) expect(screen.getByTestId('observer')).toHaveAttribute('data-revision', 'rev-1');
  else expect(screen.queryByTestId('observer')).not.toBeInTheDocument();
});
