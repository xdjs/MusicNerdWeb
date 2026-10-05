// @ts-nocheck
/// <reference types="@testing-library/jest-dom" />
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VaultManager from '@/app/artist/[id]/_components/VaultManager';
import { EditModeContext } from '@/app/_components/EditModeContext';
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock('@/app/actions/dashboardActions', () => ({
  updateSourceStatus: jest.fn().mockResolvedValue({ success: true }),
  updateSourceType: jest.fn().mockResolvedValue({ success: true }),
  searchWebForSources: jest.fn().mockResolvedValue({ success: true, count: 2 }),
  removeVaultSource: jest.fn().mockResolvedValue({ success: true }),
  removeVaultSources: jest.fn().mockResolvedValue({ success: true, count: 1 }),
}));
jest.mock('@/app/actions/addVaultSource', () => ({
  addVaultSource: jest.fn().mockResolvedValue({ success: true }),
}));
import { addVaultSource } from '@/app/actions/addVaultSource';
import { updateSourceStatus, removeVaultSource, removeVaultSources, searchWebForSources } from '@/app/actions/dashboardActions';

const pending = [{ id: 'p1', artistId: 'a1', url: 'http://e/1', title: 'Pending One', status: 'pending' }];
const approved = [{ id: 'ap1', artistId: 'a1', url: 'http://e/2', title: 'Approved One', status: 'approved' }];

function renderEditing(isEditing = true, approvedSources = approved) {
  return render(
    <EditModeContext.Provider value={{ isEditing, canEdit: true, toggle: jest.fn() }}>
      <VaultManager artistId="a1" pendingSources={pending} approvedSources={approvedSources} />
    </EditModeContext.Provider>
  );
}

describe('VaultManager', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders nothing when not editing', () => {
    const { container } = renderEditing(false);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists pending sources and approves one', async () => {
    renderEditing(true);
    expect(screen.getByText('Pending One')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /approve/i }));
    await waitFor(() => expect(updateSourceStatus).toHaveBeenCalledWith('p1', 'approved'));
  });

  it('retries completion with the same ticket instead of creating another public object', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ticket: 'same-ticket', signedUrl: 'https://storage/upload', contentType: 'application/pdf' }) })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ error: 'Retry this file', retryCompletion: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ source: { id: 'recovered', title: 'Recovered upload', status: 'approved' } }) });
    const { container } = renderEditing(true);
    const input = container.querySelector('input[type="file"]');
    const file = new File(['x'], 'retry.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(screen.getByRole('button', { name: /upload file/i })).not.toBeDisabled());
    fireEvent.change(input, { target: { files: [file] } });
    await screen.findByText('Recovered upload');
    expect(global.fetch).toHaveBeenCalledTimes(4);
    const calls = (global.fetch as jest.Mock).mock.calls;
    expect(calls[2][0]).toBe('/api/vault/upload/complete');
    expect(calls[3][0]).toBe('/api/vault/upload/complete');
    expect(calls[3][1].body).toBe(calls[2][1].body);
    global.fetch = originalFetch;
  });

  it('upload happy path: uploaded file lands in Approved section, not Pending', async () => {
    const uploadedSource = {
      id: 'up1',
      artistId: 'a1',
      url: 'http://e/up',
      title: 'Uploaded One',
      status: 'approved',
    };

    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, source: uploadedSource }),
    });

    const { container } = renderEditing(true);

    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();

    fireEvent.change(fileInput, {
      target: { files: [new File(['x'], 'up.pdf', { type: 'application/pdf' })] },
    });

    // The uploaded source should appear in the document (in Approved section)
    await screen.findByText('Uploaded One');

    // Confirm it is NOT in the Pending section
    const pendingHeading = screen.getByText(/pending review/i);
    expect(pendingHeading).toBeInTheDocument();
    // The pending section should still only show the original pending source
    expect(screen.getByText('Pending One')).toBeInTheDocument();

    // The Approved heading should be present (matches "Approved (2)")
    expect(screen.getByText(/^approved \(\d+\)$/i)).toBeInTheDocument();

    global.fetch = originalFetch;
  });

  it('removing a destination records a rejection and hides Lore-only controls', async () => {
    render(<EditModeContext.Provider value={{ isEditing: true, canEdit: true, toggle: jest.fn() }}>
      <VaultManager artistId="a1" pendingSources={pending} approvedSources={approved} reviewOnly />
    </EditModeContext.Provider>);
    expect(screen.queryByRole('button', { name: /search web for sources/i })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/add a source by url/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[1]);
    await waitFor(() => expect(updateSourceStatus).toHaveBeenCalledWith('ap1', 'rejected'));
    expect(removeVaultSource).not.toHaveBeenCalled();
    expect(removeVaultSources).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText('Approved One')).not.toBeInTheDocument());
  });

  it('delete removes a pending source', async () => {
    renderEditing(true);
    expect(screen.getByText('Pending One')).toBeInTheDocument();

    // The delete button has aria-label="Delete" added to SourceCard
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    // Click the first delete button (on the pending source card)
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => expect(removeVaultSource).toHaveBeenCalledWith('p1'));
  });

  it('web search: found sources appear in Pending immediately, no refresh prompt', async () => {
    searchWebForSources.mockResolvedValueOnce({
      success: true,
      count: 1,
      sources: [{ id: 'ws1', artistId: 'a1', url: 'http://found/1', title: 'Found Source', status: 'pending' }],
    });
    renderEditing(true);
    fireEvent.click(screen.getByRole('button', { name: /search web for sources/i }));
    // The found source appears without any manual page refresh...
    await waitFor(() => expect(screen.getByText('Found Source')).toBeInTheDocument());
    // ...and the user is never told to refresh.
    expect(screen.queryByText(/refresh to review/i)).not.toBeInTheDocument();
  });

  it('add-by-URL: typing a URL and clicking Add calls addVaultSource', async () => {
    renderEditing(true);

    const input = screen.getByPlaceholderText(/add a source by url/i);
    fireEvent.change(input, { target: { value: 'https://pitchfork.com/x' } });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() => expect(addVaultSource).toHaveBeenCalledWith('a1', 'https://pitchfork.com/x'));
  });

  it.each(['approved', 'pending'])('places a new URL in the returned %s list immediately', async status => {
    addVaultSource.mockResolvedValueOnce({ success: true, source: {
      id: 'new-source', artistId: 'a1', url: 'https://example.com/interview', title: 'New Interview', status,
    } });
    renderEditing(true);
    fireEvent.change(screen.getByPlaceholderText(/add a source by url/i), { target: { value: 'https://example.com/interview' } });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));
    await screen.findByText('New Interview');
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      description: status === 'approved' ? 'Added to Lore.' : 'Added to pending review.',
    }));
    expect(screen.getByText(status === 'approved' ? 'Approved (2)' : 'Pending review (2)')).toBeInTheDocument();
  });

  it('bulk delete: selecting an approved source and deleting calls removeVaultSources', async () => {
    renderEditing(true);

    // Select-all checkbox is the first checkbox; the per-card checkbox is the source's.
    const checkboxes = screen.getAllByRole('checkbox');
    // Last checkbox is the approved source card's select checkbox.
    fireEvent.click(checkboxes[checkboxes.length - 1]);

    fireEvent.click(screen.getByRole('button', { name: /delete 1 selected/i }));

    await waitFor(() => expect(removeVaultSources).toHaveBeenCalledWith(['ap1']));
  });

  it('type filter: clicking a type chip hides non-matching approved sources', () => {
    const approvedTyped = [
      { id: 'ap1', artistId: 'a1', url: 'http://e/2', title: 'Article Source', status: 'approved', type: 'article' },
      { id: 'ap2', artistId: 'a1', url: 'http://e/3', title: 'Review Source', status: 'approved', type: 'review' },
    ];
    renderEditing(true, approvedTyped);

    expect(screen.getByText('Article Source')).toBeInTheDocument();
    expect(screen.getByText('Review Source')).toBeInTheDocument();

    // Click the "review" chip (chips render as "review (1)").
    fireEvent.click(screen.getByRole('button', { name: /^review \(\d+\)$/i }));

    expect(screen.getByText('Review Source')).toBeInTheDocument();
    expect(screen.queryByText('Article Source')).not.toBeInTheDocument();
  });
});

it('retains contributor attribution through approval and receives refreshed display names', async () => {
  const entry = { ...pending[0], origin: 'submission', contributorName: 'First name', createdAt: '2026-09-29T13:15:00Z' };
  const view = (name: string) => <EditModeContext.Provider value={{ isEditing: true, canEdit: true, toggle: jest.fn() }}>
    <VaultManager artistId="a1" pendingSources={[{ ...entry, contributorName: name }]} approvedSources={[]} />
  </EditModeContext.Provider>;
  const { rerender } = render(view('First name'));
  expect(screen.getByText('Suggested by First name')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Approve$/i }));
  await waitFor(() => expect(screen.queryByRole('button', { name: /^Approve$/i })).not.toBeInTheDocument());
  expect(screen.getByText('Suggested by First name')).toBeInTheDocument();
  rerender(view('Updated name'));
  expect(screen.getByText('Suggested by Updated name')).toBeInTheDocument();
});
