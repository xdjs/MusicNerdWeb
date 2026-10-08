import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import LoreSubmissionsSection from '../LoreSubmissionsSection';

const refresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const data = {
  origin: '', claim: '',
  items: [{
    id: '8b3d9163-a184-468e-8772-cdd73f260835',
    artistId: '3cd4c3e4-4bf4-4b92-9b72-07f9188bd4c6',
    artistName: 'LATASHA',
    title: 'Source from zine.zora.co',
    url: 'https://zine.zora.co/latasha-interview',
    createdAt: '2026-09-26T22:00:00.000Z',
    origin: 'unknown', actorKind: null, actorName: null, actorId: null, actorEmail: null, trigger: null, activityId: null, claimed: false,
  }],
  total: 1,
  pendingTotal: 1,
  page: 1,
  pageSize: 25,
  query: '',
};

beforeEach(() => refresh.mockClear());

it('shows the pending artist and source, then approves one Lore row', async () => {
  const onReview = jest.fn().mockResolvedValue({ success: true });
  render(<LoreSubmissionsSection data={data} onReview={onReview} />);
  expect(screen.getByRole('link', { name: 'LATASHA' })).toHaveAttribute('href', '/artist/3cd4c3e4-4bf4-4b92-9b72-07f9188bd4c6');
  expect(screen.getByRole('link', { name: 'https://zine.zora.co/latasha-interview' })).toHaveAttribute('href', 'https://zine.zora.co/latasha-interview');
  fireEvent.click(screen.getByRole('button', { name: 'Approve Lore source for LATASHA' }));
  await waitFor(() => expect(onReview).toHaveBeenCalledWith(data.items[0].id, 'approved', 'pending'));
  expect(screen.getByRole('status')).toHaveTextContent('Lore source approved');
  expect(screen.queryByRole('link', { name: 'LATASHA' })).not.toBeInTheDocument();
  expect(refresh).toHaveBeenCalled();
});

it('keeps a source visible when rejection fails', async () => {
  const onReview = jest.fn().mockResolvedValue({ success: false, error: 'Review failed' });
  render(<LoreSubmissionsSection data={data} onReview={onReview} />);
  fireEvent.click(screen.getByRole('button', { name: 'Reject Lore source for LATASHA' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Review failed'));
  expect(screen.getByRole('link', { name: 'LATASHA' })).toBeInTheDocument();
  expect(refresh).not.toHaveBeenCalled();
});

it('keeps a way back when the last pending source on a later page is reviewed', async () => {
  const onReview = jest.fn().mockResolvedValue({ success: true });
  render(<LoreSubmissionsSection data={{ ...data, page: 2, total: 26 }} onReview={onReview} />);
  fireEvent.click(screen.getByRole('button', { name: 'Approve Lore source for LATASHA' }));
  await waitFor(() => expect(screen.queryByRole('link', { name: 'LATASHA' })).not.toBeInTheDocument());
  expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute('href', '/admin?section=lore&lorePage=1&loreQuery=&loreOrigin=&loreClaim=');
});

it('separates a research initiator from a submitter and exposes claim state', () => {
  render(<LoreSubmissionsSection data={{ ...data, items: [{ ...data.items[0], origin: 'research', actorKind: 'user', actorName: 'pete', actorId: 'editor', actorEmail: null, trigger: 'editor_search', activityId: 'event-1', claimed: false }] }} />);
  expect(screen.getByText(/Research requested by pete/)).toBeInTheDocument();
  expect(screen.getByText('Unclaimed profile')).toBeInTheDocument();
  expect(screen.queryByText(/Submitted by pete/)).not.toBeInTheDocument();
});
it('labels historical records honestly', () => {
  render(<LoreSubmissionsSection data={data} />);
  expect(screen.getByText(/Origin not recorded/, { selector: 'p' })).toBeInTheDocument();
});

const queueData = { ...data, total: 60, items: Array.from({ length: 3 }, (_, index) => ({
  ...data.items[0], id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  artistName: `Artist ${index + 1}`, title: `Interview ${index + 1}`, url: `https://example.com/${index + 1}`,
})) };

it('selects this page only, supports partial selection, and makes no writes on cancel', () => {
  const onApproveSelected = jest.fn();
  render(<LoreSubmissionsSection data={queueData} onApproveSelected={onApproveSelected} />);
  const all = screen.getByRole('checkbox', { name: 'Select all on this page' });
  fireEvent.click(all);
  expect(screen.getByRole('button', { name: 'Approve selected (3)' })).toBeEnabled();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Select Interview 2 for Artist 2' }));
  expect(all).toBePartiallyChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Approve selected (2)' }));
  const dialog = within(screen.getByRole('dialog'));
  expect(dialog.getByText('Artist 1')).toBeInTheDocument();
  expect(dialog.getByText('Artist 3')).toBeInTheDocument();
  expect(dialog.queryByText('Artist 2')).not.toBeInTheDocument();
  expect(dialog.getByRole('link', { name: 'https://example.com/1' })).toHaveAttribute('href', 'https://example.com/1');
  fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
  expect(onApproveSelected).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
  expect(screen.getByRole('button', { name: 'Approve selected (0)' })).toBeDisabled();
});

it('submits the confirmed IDs once, removes approved/skipped rows and retains failures', async () => {
  let finish!: (result: { success: boolean; approvedIds: string[]; skippedIds: string[]; failedIds: string[] }) => void;
  const onApproveSelected = jest.fn().mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<LoreSubmissionsSection data={queueData} onApproveSelected={onApproveSelected} />);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Select all on this page' }));
  fireEvent.click(screen.getByRole('button', { name: 'Approve selected (3)' }));
  const confirm = screen.getByRole('button', { name: 'Approve 3 sources' });
  fireEvent.click(confirm); fireEvent.click(confirm);
  expect(onApproveSelected).toHaveBeenCalledTimes(1);
  expect(onApproveSelected).toHaveBeenCalledWith(queueData.items.map(item => item.id));
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  await act(async () => finish({ success: false, approvedIds: [queueData.items[0].id], skippedIds: [queueData.items[1].id], failedIds: [queueData.items[2].id] }));
  expect(screen.getByRole('alert')).toHaveTextContent('1 approved · 1 skipped · 1 failed');
  expect(screen.queryByRole('link', { name: 'Artist 1' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Artist 2' })).not.toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: 'Select Interview 3 for Artist 3' })).toBeChecked();
  expect(refresh).toHaveBeenCalled();
});

it.each([{ page: 2 }, { query: 'Artist' }, { origin: 'research' }, { claim: 'claimed' }])('clears selection and confirmation on navigation %j', change => {
  const { rerender } = render(<LoreSubmissionsSection data={queueData} />);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Select all on this page' }));
  fireEvent.click(screen.getByRole('button', { name: 'Approve selected (3)' }));
  rerender(<LoreSubmissionsSection data={{ ...queueData, ...change }} />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Approve selected (0)' })).toBeDisabled();
});

it('does not add new arrivals to a frozen confirmation and bounds requests to ten', async () => {
  const items = Array.from({ length: 25 }, (_, index) => ({ ...queueData.items[0], id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}` }));
  const onApproveSelected = jest.fn().mockImplementation(async (ids: string[]) => ({ success: true, approvedIds: ids, skippedIds: [], failedIds: [] }));
  const { rerender } = render(<LoreSubmissionsSection data={{ ...data, items, total: 26 }} onApproveSelected={onApproveSelected} />);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Select all on this page' }));
  fireEvent.click(screen.getByRole('button', { name: 'Approve selected (25)' }));
  rerender(<LoreSubmissionsSection data={{ ...data, items: [{ ...items[0], id: 'new-arrival' }, ...items.slice(1)], total: 27 }} onApproveSelected={onApproveSelected} />);
  fireEvent.click(screen.getByRole('button', { name: 'Approve 25 sources' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('25 approved'));
  expect(onApproveSelected.mock.calls.map(([ids]) => ids.length)).toEqual([10, 10, 5]);
  expect(onApproveSelected.mock.calls.flatMap(([ids]) => ids)).toEqual(items.map(item => item.id));
  expect(screen.getByRole('button', { name: 'Approve selected (0)' })).toBeDisabled();
});

it('keeps uncertain rows available and asks for refresh after a lost response', async () => {
  const onApproveSelected = jest.fn().mockRejectedValue(new Error('Offline'));
  render(<LoreSubmissionsSection data={queueData} onApproveSelected={onApproveSelected} />);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Select all on this page' }));
  fireEvent.click(screen.getByRole('button', { name: 'Approve selected (3)' }));
  fireEvent.click(screen.getByRole('button', { name: 'Approve 3 sources' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('could not be confirmed'));
  expect(screen.getByRole('button', { name: 'Approve selected (3)' })).toBeEnabled();
});
