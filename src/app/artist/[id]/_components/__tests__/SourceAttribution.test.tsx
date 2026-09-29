import { render, screen } from '@testing-library/react';
import SourceAttribution from '../SourceAttribution';
import type { ArtistVaultSource } from '@/server/db/DbTypes';
const source = { origin: 'submission', contributorName: 'Listener', createdAt: '2026-09-29T13:15:00Z' } as ArtistVaultSource;
it('shows the contributor and added date, not publication or update time', () => {
  render(<SourceAttribution source={source} />);
  expect(screen.getByText(/Suggested by Listener/)).toBeInTheDocument();
  expect(screen.getByText('Sep 29, 2026')).toHaveAttribute('dateTime', new Date(source.createdAt).toISOString());
});
it.each([
  ['research', 'Found by automated research'],
  ['unknown', 'Contributor unknown'],
  ['upload', 'Uploaded by Listener'],
])('labels %s without misattributing research or legacy sources', (origin, label) => {
  render(<SourceAttribution source={{ ...source, origin }} />);
  expect(screen.getByText(label)).toBeInTheDocument();
});
it('handles absent names and invalid historical dates', () => {
  render(<SourceAttribution source={{ ...source, contributorName: null, createdAt: 'invalid' }} />);
  expect(screen.getByText('Suggested by a contributor')).toBeInTheDocument();
  expect(screen.getByText('Date unavailable')).toBeInTheDocument();
});
