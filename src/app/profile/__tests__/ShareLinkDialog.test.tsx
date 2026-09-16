import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ShareLinkDialog from '../ShareLinkDialog';

const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });

it('searches and bookmarks directly without navigating to the artist', async () => {
  global.fetch = jest.fn().mockResolvedValue({ok: true, json: async () => ({results: [{id: 'artist-1', name: 'Pete Rango', imageUrl: '/demo/pete-rango-logo.png'}]})});
  const onBookmark = jest.fn();
  const { rerender } = render(<ShareLinkDialog open onOpenChange={jest.fn()} onBookmark={onBookmark} />);
  fireEvent.change(screen.getByLabelText('Search artists to bookmark'), {target: {value: 'Pete'}});
  fireEvent.click(await screen.findByRole('button', {name: 'Bookmark Pete Rango'}));
  expect(onBookmark).toHaveBeenCalledWith(expect.objectContaining({id: 'artist-1', name: 'Pete Rango'}));
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
  rerender(<ShareLinkDialog open onOpenChange={jest.fn()} onBookmark={onBookmark} bookmarkedIds={['artist-1']} />);
  expect(screen.getByRole('button', {name: 'Bookmarked Pete Rango'})).toBeDisabled();
});

it('does not offer external-only artists as existing bookmarks', async () => {
  global.fetch = jest.fn().mockResolvedValue({ok: true, json: async () => ({results: [{id: 'external-1', name: 'External artist', isExternalOnly: true}]})});
  render(<ShareLinkDialog open onOpenChange={jest.fn()} onBookmark={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('Search artists to bookmark'), {target: {value: 'External'}});
  await waitFor(() => expect(screen.getByText(/No artists found in MusicNerd/)).toBeInTheDocument());
  expect(screen.queryByRole('button', {name: 'Bookmark External artist'})).not.toBeInTheDocument();
});
