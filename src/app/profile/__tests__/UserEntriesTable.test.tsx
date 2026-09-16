import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import UserEntriesTable from '../UserEntriesTable';
const rows = Array.from({ length: 12 }, (_, i) => ({ id: String(i), artistName: i === 11 ? 'Pete Rango' : `Artist ${i}`, siteName: i === 11 ? 'apple' : 'spotify', accepted: i !== 11, createdAt: `2026-09-${String(i + 1).padStart(2, '0')}T12:00:00Z`, ugcUrl: 'https://example.com/artist' }));
afterEach(() => jest.restoreAllMocks());
it('searches and filters the entire loaded history, including records beyond page one', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ entries: rows }) } as Response);
  render(<UserEntriesTable />);
  expect(await screen.findByText('12 contributions')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Contribution order'), { target: { value: 'oldest' } });
  expect(screen.queryByText('Pete Rango')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByText('Pete Rango')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Search contribution artists'), { target: { value: 'Pete' } });
  expect(screen.getByText('1 contribution')).toBeInTheDocument();
  expect(screen.getByText('Pete Rango')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Contribution status'), { target: { value: 'approved' } });
  expect(screen.getByText('No contributions match these filters.')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith('/api/userEntries?all=true', expect.anything());
});
it('shows a retryable failure rather than empty history', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: false } as Response).mockResolvedValueOnce({ ok: true, json: async () => ({ entries: [] }) } as Response);
  render(<UserEntriesTable />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
});
