import { getAccessToken } from '@privy-io/react-auth';
import { downloadKnowledgeDoc } from '../downloadKnowledgeDoc';

jest.mock('@privy-io/react-auth', () => ({ getAccessToken: jest.fn() }));
jest.mock('@/lib/musicNerdApi/musicNerdApiUrl', () => ({ musicNerdApiUrl: (path: string) => `https://api-preview.test${path}` }));
const token = getAccessToken as jest.Mock;
const blob = new Blob(['# Lore']);
const file = (disposition: string | null) => ({ ok: true, headers: new Headers(disposition ? { 'Content-Disposition': disposition } : {}), blob: async () => blob });
let click: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  token.mockResolvedValue('private-token');
  URL.createObjectURL = jest.fn(() => 'blob:lore');
  URL.revokeObjectURL = jest.fn();
  click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => click.mockRestore());

it('fetches the export with bearer authorization and saves it under the API file name', async () => {
  global.fetch = jest.fn().mockResolvedValue(file('attachment; filename="pete-rango-2026-10-22.md"'));
  await downloadKnowledgeDoc('a1');
  const saved = click.mock.contexts[0] as HTMLAnchorElement;
  expect(fetch).toHaveBeenCalledWith('https://api-preview.test/api/artist/a1/knowledge-doc/export', {
    headers: { Authorization: 'Bearer private-token' }, credentials: 'omit', cache: 'no-store',
  });
  expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
  expect(saved?.download).toBe('pete-rango-2026-10-22.md');
  expect(saved?.href).toBe('blob:lore');
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:lore');
});
it('falls back to a generic name when the header is not readable', async () => {
  global.fetch = jest.fn().mockResolvedValue(file(null));
  await downloadKnowledgeDoc('a1');
  expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe('lore.md');
});
it('throws the API error and saves nothing when the export is refused', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ status: 'error', error: 'Not your artist' }) });
  await expect(downloadKnowledgeDoc('a1')).rejects.toThrow('Not your artist');
  expect(click).not.toHaveBeenCalled();
});
it('does not fall back to a cookie route when Privy has no token', async () => {
  global.fetch = jest.fn();
  token.mockResolvedValue(null);
  await expect(downloadKnowledgeDoc('a1')).rejects.toThrow('sign in');
  expect(fetch).not.toHaveBeenCalled();
});
