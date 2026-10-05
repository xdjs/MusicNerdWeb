import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BulkApproveContributor from '../BulkApproveContributor';
import { getContributorApprovalItems } from '@/app/actions/getContributorApprovalItems';
import { approveContributorSubmissions } from '@/app/actions/approveContributorSubmissions';

const refresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
jest.mock('@/app/actions/getContributorApprovalItems', () => ({ getContributorApprovalItems: jest.fn() }));
jest.mock('@/app/actions/approveContributorSubmissions', () => ({ approveContributorSubmissions: jest.fn() }));
const items = [
  { id: 'source-1', type: 'lore', title: 'Interview', artistName: 'Artist One', url: 'https://example.com/interview' },
  { id: 'link-1', type: 'link', title: 'Instagram', artistName: 'Artist Two', url: 'https://instagram.com/artist' },
];
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getContributorApprovalItems).mockResolvedValue({ success: true, items, hasMore: false } as never);
  jest.mocked(approveContributorSubmissions).mockResolvedValue({ success: true, approved: 2, skipped: 0, failed: 0 });
});

it('loads the contributor’s full pending set and requires confirmation before writing', async () => {
  render(<BulkApproveContributor contributorId="contributor" contributorName="Tempo Menace" />);
  fireEvent.click(screen.getByRole('button', { name: 'Bulk approve' }));
  await screen.findByText('Interview');
  expect(getContributorApprovalItems).toHaveBeenCalledWith('contributor');
  expect(screen.getByRole('dialog')).toHaveTextContent('Tempo Menace');
  expect(screen.getByRole('dialog')).toHaveTextContent('Artist Two');
  expect(approveContributorSubmissions).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Approve 2 submissions' }));
  await waitFor(() => expect(approveContributorSubmissions).toHaveBeenCalledWith('contributor', [
    { id: 'source-1', type: 'lore' }, { id: 'link-1', type: 'link' },
  ]));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('2 approved'));
  expect(refresh).toHaveBeenCalled();
});

it('does not offer an approval when that contributor has no pending submissions', async () => {
  jest.mocked(getContributorApprovalItems).mockResolvedValue({ success: true, items: [], hasMore: false });
  render(<BulkApproveContributor contributorId="contributor" contributorName="Tempo Menace" />);
  fireEvent.click(screen.getByRole('button', { name: 'Bulk approve' }));
  await screen.findByText(/No pending submissions/);
  expect(screen.queryByRole('button', { name: /^Approve \d/ })).not.toBeInTheDocument();
});

it('retains partial failure details after refreshing the history', async () => {
  jest.mocked(approveContributorSubmissions).mockResolvedValue({ success: false, approved: 1, skipped: 0, failed: 1 });
  render(<BulkApproveContributor contributorId="contributor" contributorName="Tempo Menace" />);
  fireEvent.click(screen.getByRole('button', { name: 'Bulk approve' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Approve 2 submissions' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('1 approved'));
  expect(screen.getByRole('alert')).toHaveTextContent('1 failed');
  expect(screen.queryByRole('button', { name: 'Approve 2 submissions' })).not.toBeInTheDocument();
});
