import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ShareLinkDialog from '../ShareLinkDialog';

const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });

it('searches for an artist to contribute to, without a bookmark action', async () => {
  global.fetch = jest.fn().mockResolvedValue({ok: true, json: async () => ({results: [{id: 'artist-1', name: 'Pete Rango'}]})});
  render(<ShareLinkDialog open onOpenChange={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('Search for an artist to share a link'), {target: {value: 'Pete'}});
  expect(await screen.findByRole('link', {name: 'Pete Rango'})).toHaveAttribute('href','/artist/artist-1#mn-links');
  expect(screen.queryByRole('button',{name:/bookmark/i})).not.toBeInTheDocument();
});

it('does not offer external-only artists as contribution targets', async () => {
  global.fetch = jest.fn().mockResolvedValue({ok: true, json: async () => ({results: [{id: 'external-1', name: 'External artist', isExternalOnly: true}]})});
  render(<ShareLinkDialog open onOpenChange={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('Search for an artist to share a link'), {target: {value: 'External'}});
  await waitFor(() => expect(screen.getByText(/No artists found in MusicNerd/)).toBeInTheDocument());
  expect(screen.queryByRole('button', {name: 'Bookmark External artist'})).not.toBeInTheDocument();
});
