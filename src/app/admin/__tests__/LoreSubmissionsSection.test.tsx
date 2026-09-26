import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LoreSubmissionsSection from '../LoreSubmissionsSection';

const refresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const data = {
  items: [{
    id: '8b3d9163-a184-468e-8772-cdd73f260835',
    artistId: '3cd4c3e4-4bf4-4b92-9b72-07f9188bd4c6',
    artistName: 'LATASHA',
    title: 'Source from zine.zora.co',
    url: 'https://zine.zora.co/latasha-interview',
    createdAt: '2026-09-26T22:00:00.000Z',
  }],
  total: 1,
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
  await waitFor(() => expect(onReview).toHaveBeenCalledWith(data.items[0].id, 'approved'));
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
  expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute('href', '/admin?section=lore&lorePage=1&loreQuery=');
});
