import { addArtist } from '../addArtist';

describe('addArtist Server Action', () => {
  it('should return error indicating authentication is disabled', async () => {
    const result = await addArtist('test-spotify-id');

    expect(result).toEqual({
      status: 'error',
      message: 'Authentication disabled'
    });
  });
});
