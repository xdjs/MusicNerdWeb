import { test, expect } from '@playwright/test';

test.describe('UGC Auth Routes', () => {
  test.skip('authenticated user sees their UGC count', async ({ request }) => {
    const response = await request.get('/api/ugcCount');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('count');
  });

  test.skip('admin sees pending UGC count', async ({ request }) => {
    const response = await request.get('/api/pendingUGCCount');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('count');
    expect(data.count).toBeGreaterThanOrEqual(0);
  });

  test.skip('regular user gets { count: 0 } for pending UGC count', async ({ request }) => {
    const response = await request.get('/api/pendingUGCCount');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ count: 0 });
  });

  test.skip('authenticated user can call removeArtistData endpoint', async ({ request }) => {
    const response = await request.post('/api/removeArtistData', {
      data: { artistId: 'test-artist-id', siteName: 'spotify' },
    });
    // Expect either 200 (success) or 403 (not whitelisted/admin)
    expect([200, 403]).toContain(response.status());
  });

  test.skip('unauthenticated request gets 401 on removeArtistData', async ({ request }) => {
    const response = await request.post('/api/removeArtistData', {
      data: { artistId: 'test-artist-id', siteName: 'spotify' },
    });
    expect(response.status()).toBe(401);
  });
});
