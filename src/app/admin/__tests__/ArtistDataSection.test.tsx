import { render, screen } from '@testing-library/react';
import ArtistDataSection from '../ArtistDataSection';
import { requestAdminApi } from '@/lib/admin/requestAdminApi';

jest.mock('@/lib/admin/requestAdminApi', () => ({ requestAdminApi: jest.fn() }));
const request = requestAdminApi as jest.Mock;
beforeEach(() => jest.clearAllMocks());

it("loads the summary from MusicNerdAPI's admin route and shows its error envelope", async () => {
  request.mockResolvedValue({ ok: false, status: 403, json: async () => ({ status: 'error', error: 'Forbidden' }) });
  render(<ArtistDataSection />);
  expect(await screen.findByText('Forbidden')).toBeInTheDocument();
  expect(request).toHaveBeenCalledWith('/api/admin/artist-data');
});
