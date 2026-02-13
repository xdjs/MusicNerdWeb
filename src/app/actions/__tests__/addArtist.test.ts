jest.mock('@/server/auth', () => ({
  getServerAuthSession: jest.fn(),
}));

jest.mock('@/server/utils/queries/externalApiQueries', () => ({
  getSpotifyHeaders: jest.fn(),
  getSpotifyArtist: jest.fn(),
}));

jest.mock('@/server/utils/queries/userQueries', () => ({
  getUserById: jest.fn(),
}));

jest.mock('@/server/utils/queries/discord', () => ({
  sendDiscordMessage: jest.fn(),
}));

jest.mock('@/server/utils/queries/artistQueries', () => ({
  addArtist: jest.fn(),
}));

import { addArtist } from '../addArtist';
import { getServerAuthSession } from '@/server/auth';
import { getSpotifyHeaders, getSpotifyArtist } from '@/server/utils/queries/externalApiQueries';
import { addArtist as dbAddArtist } from '@/server/utils/queries/artistQueries';

const mockGetSession = getServerAuthSession as jest.Mock;
const mockGetHeaders = getSpotifyHeaders as jest.Mock;
const mockGetArtist = getSpotifyArtist as jest.Mock;
const mockDbAddArtist = dbAddArtist as jest.Mock;

describe('addArtist Server Action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw when not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(addArtist('test-spotify-id')).rejects.toThrow('Not authenticated');
  });

  it('should return error when Spotify headers fail', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockGetHeaders.mockResolvedValue({ headers: {} });

    const result = await addArtist('test-spotify-id');

    expect(result).toEqual({
      status: 'error',
      message: 'Failed to authenticate with Spotify',
    });
  });

  it('should return success when artist is added', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockGetHeaders.mockResolvedValue({ headers: { Authorization: 'Bearer token' } });
    mockGetArtist.mockResolvedValue({ data: { name: 'Test Artist' } });
    mockDbAddArtist.mockResolvedValue({ status: 'success', artistId: '123', artistName: 'Test Artist' });

    const result = await addArtist('test-spotify-id');

    expect(result).toEqual({ status: 'success', artistId: '123', artistName: 'Test Artist' });
  });
});
