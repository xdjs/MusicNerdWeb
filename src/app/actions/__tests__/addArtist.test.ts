import { addArtist } from '../addArtist';

describe('addArtist Server Action', () => {
  it('should return an error response when called without proper setup', async () => {
    const result = await addArtist('test-spotify-id');

    // The function returns an error when called in test environment
    // (due to missing Spotify API mock or auth session)
    expect(result).toHaveProperty('status');
    expect(result.status).toBe('error');
  });
});
