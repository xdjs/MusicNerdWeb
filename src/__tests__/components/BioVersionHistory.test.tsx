/// <reference types="@testing-library/jest-dom" />
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BioVersionHistory from '@/app/artist/[id]/_components/BioVersionHistory';
import { EditModeContext } from '@/app/_components/EditModeContext';

const getArtistBioVersions = jest.fn();
const pinBioVersion = jest.fn();
const deleteBioVersion = jest.fn();
const unpinBio = jest.fn();
jest.mock('@/lib/musicNerdApi/requestMusicNerdApi', () => ({
  requestMusicNerdApi: (path: string, init?: { method?: string; body?: { versionId?: string } }) => {
    if (path.endsWith('/versions')) return getArtistBioVersions(path);
    if (path.endsWith('/pin')) return init?.method === 'PUT' ? pinBioVersion(init.body?.versionId, path) : unpinBio(path);
    return deleteBioVersion(path);
  },
}));

function renderEditing(isEditing = true) {
  return render(
    <EditModeContext.Provider value={{ isEditing, canEdit: true, toggle: jest.fn() }}>
      <BioVersionHistory artistId="a1" />
    </EditModeContext.Provider>
  );
}

function resetApi() {
  jest.clearAllMocks();
  getArtistBioVersions.mockResolvedValue({
    success: true,
    versions: [
      { id: 'v1', artistId: 'a1', bioText: 'First bio', isPinned: true, createdAt: '2026-01-01T00:00:00Z' },
      { id: 'v2', artistId: 'a1', bioText: 'Second bio', isPinned: false, createdAt: '2026-02-01T00:00:00Z' },
    ],
  });
  pinBioVersion.mockResolvedValue({ success: true });
  deleteBioVersion.mockResolvedValue({ success: true });
  unpinBio.mockResolvedValue({ success: true });
}

describe('BioVersionHistory', () => {
  beforeEach(() => resetApi());

  it('renders nothing when not editing', () => {
    const { container } = renderEditing(false);
    expect(container).toBeEmptyDOMElement();
  });

  it('loads versions and pins one with the artistId', async () => {
    renderEditing(true);
    // history is behind a toggle; open it
    fireEvent.click(screen.getByText(/version history/i));
    await waitFor(() => expect(screen.getByText('Second bio')).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: /^pin$/i })[0]);
    await waitFor(() => expect(pinBioVersion).toHaveBeenCalledWith('v2', '/api/artistBio/a1/pin'));
  });

  it('deletes a version with the artistId (after confirmation)', async () => {
    renderEditing(true);
    fireEvent.click(screen.getByText(/version history/i));
    await waitFor(() => expect(screen.getByText('Second bio')).toBeInTheDocument());
    // versions render newest-first: v2 (Feb, unpinned) is index 0; v1 (Jan, pinned) is index 1
    // the pinned version's Delete button is disabled, so index 0 is the enabled one
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    // delete is a two-step confirm — nothing deleted until "Confirm" is clicked
    expect(deleteBioVersion).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    await waitFor(() => expect(deleteBioVersion).toHaveBeenCalledWith('/api/artistBio/a1/versions/v2'));
  });
});

test('failed unpin keeps the lock and does not notify a bio change', async () => {
  resetApi();
  unpinBio.mockResolvedValueOnce({ success: false, error: 'Could not unpin bio' });
  const onChanged = jest.fn();
  const onPinnedChange = jest.fn();
  render(<EditModeContext.Provider value={{ isEditing: true, canEdit: true, toggle: jest.fn() }}>
    <BioVersionHistory artistId="a1" onChanged={onChanged} onPinnedChange={onPinnedChange} />
  </EditModeContext.Provider>);
  fireEvent.click(await screen.findByRole('button', { name: 'Unpin to edit' }));
  await waitFor(() => expect(unpinBio).toHaveBeenCalledWith('/api/artistBio/a1/pin'));
  expect(screen.getByRole('button', { name: 'Unpin to edit' })).toBeInTheDocument();
  expect(onChanged).not.toHaveBeenCalled();
  expect(onPinnedChange).not.toHaveBeenCalledWith(false);
});
