import ResearchEditBoundary from "../onboarding/ResearchEditBoundary";
import {OnboardingProgressContext, type ResearchContextValue} from "../onboarding/OnboardingProgressContext";
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { EditModeContext } from '@/app/_components/EditModeContext';
import type { ArtistVaultSource } from '@/server/db/DbTypes';
import SortableArtistLinks from '@/app/_components/SortableArtistLinks';
import { getSourceLinks } from '@/lib/musicLinks/getSourceLinks';
import VaultSection from '../VaultSection';

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock('@/app/actions/dashboardActions', () => ({ searchWebForSources: jest.fn() }));
jest.mock('@/lib/source/requestArtistSources', () => ({ requestArtistSources: jest.fn() }));
jest.mock('../SuggestedLinkReview', () => function SuggestedLinkReview(){return null;});
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
    <div data-testid="links-editor"><SortableArtistLinks artistId="artist-1" section="links" links={[]} supplementalLinks={getSourceLinks(approvedSources)} canEdit /></div>
    <div data-testid="lore-editor"><VaultSection artistId="artist-1" isClaimed approvedSources={approvedSources} pendingSources={pendingSources} /></div>
  </EditModeContext.Provider>;
}

it('keeps approved source evidence in Lore when its destination classification changes', () => {
  const {rerender}=render(view('music','approved'));
  expect(within(screen.getByTestId('lore-editor')).getByText(moving.title!)).toBeVisible();
  rerender(view('interview','approved'));
  expect(within(screen.getByTestId('lore-editor')).getByText(moving.title!)).toBeVisible();
  expect(within(screen.getByTestId('links-editor')).queryByText(moving.title!)).not.toBeInTheDocument();
});
it('moves a pending destination to source review when reclassified as an interview', () => {
  const {rerender}=render(view('music','pending'));
  expect(within(screen.getByTestId('lore-editor')).queryByText(moving.title!)).not.toBeInTheDocument();
  rerender(view('interview','pending'));
  expect(within(screen.getByTestId('lore-editor')).getByText(moving.title!)).toBeVisible();
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

it('updates refreshed Lore rows without losing the suspended URL and search drafts', () => {
  const research:ResearchContextValue={steps:{profiles:'yes',vault:null,interview:null,publish:null},currentStep:'vault',fresh:{profiles:false,vault:false,publish:false},markSeen:jest.fn(),complete:false,baseline:{links:[],sources:[]}};
  const renderView=(blocked:boolean,rows:ArtistVaultSource[])=><EditModeContext.Provider value={editing}><OnboardingProgressContext.Provider value={blocked?research:null}><ResearchEditBoundary><VaultSection artistId="artist-1" isClaimed approvedSources={rows} pendingSources={[]} /></ResearchEditBoundary></OnboardingProgressContext.Provider></EditModeContext.Provider>;
  const {rerender}=render(renderView(false,[article]));
  const input=screen.getByPlaceholderText(/add a source by url/i);
  fireEvent.change(input,{target:{value:'https://magazine.example/unfinished'}});
  fireEvent.change(screen.getByPlaceholderText(/search by title or website/i),{target:{value:'interview'}});
  const second=source('New interview','https://press.example/new','interview');
  rerender(renderView(true,[article,second]));
  const third=source('Resume interview','https://press.example/resume','interview');
  rerender(renderView(false,[article,second,third]));
  expect(screen.getByPlaceholderText(/add a source by url/i)).toBe(input);
  expect(input).toHaveValue('https://magazine.example/unfinished');
  expect(screen.getByPlaceholderText(/search by title or website/i)).toHaveValue('interview');
  expect(screen.getByText('New interview')).toBeVisible();
  expect(screen.getByText('Resume interview')).toBeVisible();
});


it('drops removed source selections but retains selections for existing rows', () => {
  const second = source('Second interview', 'https://press.example/second', 'interview');
  const renderView = (rows: ArtistVaultSource[]) => <EditModeContext.Provider value={editing}><VaultSection artistId="artist-1" isClaimed approvedSources={rows} pendingSources={[]} /></EditModeContext.Provider>;
  const { rerender } = render(renderView([article, second]));
  fireEvent.click(screen.getAllByRole('checkbox')[0]);
  expect(screen.getByRole('button', { name: 'Delete 2 selected' })).toBeVisible();
  rerender(renderView([second]));
  expect(screen.getByRole('button', { name: 'Delete 1 selected' })).toBeVisible();
  expect(screen.getAllByRole('checkbox')[1]).toBeChecked();
  rerender(renderView([]));
  expect(screen.queryByRole('button', { name: /Delete .* selected/ })).not.toBeInTheDocument();
});
