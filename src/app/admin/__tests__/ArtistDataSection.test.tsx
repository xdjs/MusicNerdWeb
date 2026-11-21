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

it('shows today counts for platform IDs only, not for links', async () => {
  request.mockResolvedValue({ ok: true, json: async () => ({
    totalArtists: 10, totalWithSpotify: 8,
    platformIdCoverage: [{ platform: 'deezer', count: 4, percentage: 50, todayCount: 2 }],
    artistLinkCoverage: [{ column: 'instagram', category: 'social', count: 5, percentage: 50, todayCount: 3 }],
    completenessDistribution: [], medianFields: 0, averageFields: 0,
    enrichmentReadiness: { hasWikidata: 0, hasSpotifyNoWikidata: 0, noSpotify: 0 },
  }) });
  render(<ArtistDataSection />);
  expect(await screen.findByText('+2 today')).toBeInTheDocument();
  expect(screen.getByText('instagram')).toBeInTheDocument();
  expect(screen.queryByText('+3 today')).not.toBeInTheDocument();
});
