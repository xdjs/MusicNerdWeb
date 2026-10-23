import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import McpKeysSection from '../McpKeysSection';
import { requestAdminApi } from '@/lib/admin/requestAdminApi';

jest.mock('@/lib/admin/requestAdminApi', () => ({ requestAdminApi: jest.fn() }));
const request = requestAdminApi as jest.Mock;
const key = { id: 'k1', label: 'Old bot', keyHashPrefix: 'abcd1234', createdAt: '2026-10-01T00:00:00Z', revokedAt: null };
const created = { id: 'k2', label: 'New bot', keyHashPrefix: 'efgh5678', createdAt: '2026-10-22T00:00:00Z', revokedAt: null };
beforeEach(() => jest.clearAllMocks());

it('creates a key on MusicNerdAPI, shows the raw key, and reloads the bare key array', async () => {
  request.mockImplementation(async (path: string, init?: { method?: string }) => init?.method === 'POST'
    ? { ok: true, json: async () => ({ status: 'ok', rawKey: 'raw-secret', label: 'New bot' }) }
    : { ok: true, json: async () => [created, key] });
  render(<McpKeysSection initialKeys={[key]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Create Key' }));
  fireEvent.change(screen.getByPlaceholderText('Key label'), { target: { value: ' New bot ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create' }));
  expect(await screen.findByText('raw-secret')).toBeInTheDocument();
  expect(request).toHaveBeenCalledWith('/api/admin/mcp-keys', { method: 'POST', body: { label: 'New bot' } });
  expect(request).toHaveBeenLastCalledWith('/api/admin/mcp-keys');
  await waitFor(() => expect(screen.getAllByText('New bot').length).toBeGreaterThan(0));
});

it('revokes through MusicNerdAPI and shows the API error envelope on failure', async () => {
  request.mockResolvedValueOnce({ ok: false, json: async () => ({ status: 'error', error: 'Key not found' }) });
  render(<McpKeysSection initialKeys={[key]} />);
  fireEvent.click(screen.getAllByRole('button', { name: 'Revoke' })[0]);
  const dialog = await screen.findByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Revoke' }));
  expect(await within(dialog).findByText('Key not found')).toBeInTheDocument();
  expect(request).toHaveBeenCalledWith('/api/admin/mcp-keys/k1/revoke', { method: 'POST' });
});
