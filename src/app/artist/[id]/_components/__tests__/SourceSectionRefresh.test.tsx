import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { EditModeContext } from '@/app/_components/EditModeContext';
import type { ArtistVaultSource } from '@/server/db/DbTypes';
import OfficialSiteLinks from '../OfficialSiteLinks';
import VaultSection from '../VaultSection';

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock('@/app/actions/dashboardActions', () => ({
  updateSourceStatus: jest.fn(), updateSourceType: jest.fn(), removeVaultSource: jest.fn(),
  removeVaultSources: jest.fn(), searchWebForSources: jest.fn(),
}));
jest.mock('@/app/actions/addVaultSource', () => ({ addVaultSource: jest.fn() }));
jest.mock('../BioVersionHistory', () => function BioVersionHistory() { return null; });
jest.mock('../SuggestLoreSource', () => function SuggestLoreSource() { return null; });
jest.mock('../RevealSection', () => function RevealSection({ children }: { children: React.ReactNode }) { return <section>{children}</section>; });

const source = (id: string, url: string, type: string, status: ArtistVaultSource['status'] = 'approved') => ({
  id, artistId: 'artist-1', url, type, status, title: id,
}) as ArtistVaultSource;

const website = source('Official website', 'https://artist.example/', 'website');
const article = source('Existing interview', 'https://magazine.example/interview', 'interview');
const moving = source('Source being reclassified', 'https://soundcloud.com/artist', 'music');
const editing = { isEditing: true, canEdit: true, toggle: jest.fn() };

function view(type: string, status: ArtistVaultSource['status'], url = moving.url) {
  const entry = { ...moving, type, status, url };
  const approvedSources = [website, article, ...(status === 'approved' ? [entry] : [])];
  const pendingSources = status === 'pending' ? [entry] : [];
  return <EditModeContext.Provider value={editing}>
    <div data-testid="links-editor"><OfficialSiteLinks artistId="artist-1" sources={approvedSources} pendingSources={pendingSources} /></div>
    <div data-testid="lore-editor"><VaultSection artistId="artist-1" isClaimed approvedSources={approvedSources} pendingSources={pendingSources} /></div>
  </EditModeContext.Provider>;
}

it.each(['approved', 'pending'] as const)('moves a %s source from Links to Lore after a server refresh without leaving edit mode', status => {
  const { rerender } = render(view('music', status));
  expect(within(screen.getByTestId('links-editor')).getByText(moving.title!)).toBeVisible();
  expect(within(screen.getByTestId('lore-editor')).queryByText(moving.title!)).not.toBeInTheDocument();

  rerender(view('interview', status));
  expect(within(screen.getByTestId('links-editor')).queryByText(moving.title!)).not.toBeInTheDocument();
  expect(within(screen.getByTestId('lore-editor')).getByText(moving.title!)).toBeVisible();
  expect(screen.getAllByText(moving.title!)).toHaveLength(1);
});

it.each(['approved', 'pending'] as const)('moves a %s source from Lore to Links after a server refresh without leaving edit mode', status => {
  const { rerender } = render(view('interview', status));
  expect(within(screen.getByTestId('lore-editor')).getByText(moving.title!)).toBeVisible();
  expect(within(screen.getByTestId('links-editor')).queryByText(moving.title!)).not.toBeInTheDocument();

  rerender(view('music', status));
  expect(within(screen.getByTestId('lore-editor')).queryByText(moving.title!)).not.toBeInTheDocument();
  expect(within(screen.getByTestId('links-editor')).getByText(moving.title!)).toBeVisible();
  expect(screen.getAllByText(moving.title!)).toHaveLength(1);
});

it('preserves an unfinished Lore URL when an unrelated server refresh returns the same sources', () => {
  const { rerender } = render(view('music', 'approved'));
  fireEvent.change(screen.getByPlaceholderText(/add a source by url/i), { target: { value: 'https://magazine.example/new' } });
  rerender(view('music', 'approved'));
  expect(screen.getByPlaceholderText(/add a source by url/i)).toHaveValue('https://magazine.example/new');
});


it.each(['approved', 'pending'] as const)('keeps a %s individual track in Lore when reclassified as music during editing', status => {
  const trackUrl = 'https://soundcloud.com/artist/individual-track';
  const { rerender } = render(view('interview', status, trackUrl));
  rerender(view('music', status, trackUrl));

  expect(within(screen.getByTestId('links-editor')).queryByText(moving.title!)).not.toBeInTheDocument();
  expect(within(screen.getByTestId('lore-editor')).getByText(moving.title!)).toBeVisible();
  expect(screen.getAllByText(moving.title!)).toHaveLength(1);
});
