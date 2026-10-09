import React from 'react';
import { render, screen } from '@testing-library/react';
import OfficialSiteLinks from '../OfficialSiteLinks';
import { EditModeContext } from '@/app/_components/EditModeContext';
import type { ArtistVaultSource } from '@/server/db/DbTypes';

jest.mock('../VaultManager', () => ({ __esModule: true, default: ({ pendingSources, approvedSources, reviewOnly }: {pendingSources: ArtistVaultSource[]; approvedSources: ArtistVaultSource[]; reviewOnly: boolean}) => <div data-testid="review" data-pending={pendingSources.length} data-approved={approvedSources.length} data-review-only={String(reviewOnly)} /> }));

const source = (id: string, url: string, status = 'approved', type = 'article') => ({ id, url, status, type, title: 'Pete Rango' }) as ArtistVaultSource;
const apple = source('apple', 'https://music.apple.com/us/artist/pete-rango/1513734272', 'approved', 'profile');
const pending = source('beatport', 'https://www.beatport.com/artist/pete-rango/1041889', 'pending');

it('leaves artist platforms to the shared icon grid and keeps pending links private', () => {
  render(<OfficialSiteLinks artistId="a1" sources={[apple]} pendingSources={[pending]} />);
  expect(screen.queryByRole('link', { name: /Apple Music/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Beatport/ })).not.toBeInTheDocument();
  expect(screen.queryByTestId('review')).not.toBeInTheDocument();
});

it('reuses exact source records for editor approval and removal in Links', () => {
  render(<EditModeContext.Provider value={{ isEditing: true, canEdit: true, toggle: jest.fn() }}>
    <OfficialSiteLinks artistId="a1" sources={[apple]} pendingSources={[pending]} />
  </EditModeContext.Provider>);
  expect(screen.getByTestId('review')).toHaveAttribute('data-pending', '1');
  expect(screen.getByTestId('review')).toHaveAttribute('data-approved', '1');
  expect(screen.getByTestId('review')).toHaveAttribute('data-review-only', 'true');
});

it('suppresses established identity conflicts publicly but keeps the source available for editor review', () => {
  const {unmount} = render(<OfficialSiteLinks artistId="a1" sources={[apple]} blockedSourceIds={[apple.id]} />);
  expect(screen.queryByRole('link', {name:/Apple Music/})).not.toBeInTheDocument();
  unmount();
  render(<EditModeContext.Provider value={{isEditing:true, canEdit:true, toggle:jest.fn()}}>
    <OfficialSiteLinks artistId="a1" sources={[apple]} blockedSourceIds={[apple.id]} />
  </EditModeContext.Provider>);
  expect(screen.getByTestId('review')).toHaveAttribute('data-approved','1');
  expect(screen.getByText(/needs identity review/)).toBeInTheDocument();
});
