import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { NextResponse } from 'next/server';

// Mock NextResponse
const mockNextResponseJson = jest.fn().mockImplementation((data, options) => ({
  json: () => Promise.resolve(data),
  status: options?.status || 200,
  ...data
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: mockNextResponseJson
  }
}));

// Mock dependencies
jest.mock('@/server/lib/openai', () => ({
  openai: {
    responses: {
      create: jest.fn()
    }
  }
}));

jest.mock('@/server/utils/queries/artistQueries', () => ({
  getArtistById: jest.fn()
}));

jest.mock('@/server/db/drizzle', () => ({
  db: {
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined)
      })
    })
  }
}));

jest.mock('@/server/db/schema', () => ({
  artists: {}
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn()
}));

jest.mock('@/server/utils/queries/externalApiQueries', () => ({
  getArtistTopTrackName: jest.fn(),
  getNumberOfSpotifyReleases: jest.fn(),
  getSpotifyArtist: jest.fn(),
  getSpotifyHeaders: jest.fn()
}));

describe('artistBioQuery - OPENAI_MODEL usage', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockNextResponseJson.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should use OPENAI_MODEL environment variable in OpenAI API call', async () => {
    // Set custom model in environment
    process.env = { 
      ...originalEnv, 
      OPENAI_MODEL: 'gpt-4-custom',
      OPENAI_API_KEY: 'test-key',
      OPENAI_TIMEOUT_MS: '60000'
    };

    // Mock the artist data
    const mockArtist = {
      id: 'test-id',
      name: 'Test Artist',
      spotify: null,
      instagram: null,
      x: null,
      soundcloud: null,
      youtube: null,
      youtubechannel: null,
      wikipedia: null
    };

    // Mock the OpenAI response
    const mockOpenAIResponse = {
      output_text: 'Generated bio text'
    };

    // Import mocked modules
    const { openai } = await import('@/server/lib/openai');
    const { getArtistById } = await import('@/server/utils/queries/artistQueries');
    
    // Setup mocks
    (getArtistById as jest.MockedFunction<typeof getArtistById>).mockResolvedValue(mockArtist);
    (openai.responses.create as jest.MockedFunction<typeof openai.responses.create>).mockResolvedValue(mockOpenAIResponse);

    // Import and call the function
    const { getOpenAIBio } = await import('@/server/utils/queries/artistBioQuery');
    const result = await getOpenAIBio('test-id');

    // Verify the OpenAI call was made with the correct model
    expect(openai.responses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4-custom',
        prompt: expect.objectContaining({
          id: expect.any(String),
          variables: expect.objectContaining({
            artist_name: 'Test Artist',
            artist_data: expect.any(String)
          })
        })
      })
    );

    // Verify NextResponse.json was called with the bio
    expect(mockNextResponseJson).toHaveBeenCalledWith({ bio: 'Generated bio text' });
  });

  it('should use default model when OPENAI_MODEL is not set', async () => {
    // Remove OPENAI_MODEL from environment
    process.env = { 
      ...originalEnv,
      OPENAI_API_KEY: 'test-key',
      OPENAI_TIMEOUT_MS: '60000'
    };
    delete process.env.OPENAI_MODEL;

    // Mock the artist data
    const mockArtist = {
      id: 'test-id',
      name: 'Test Artist',
      spotify: null,
      instagram: null,
      x: null,
      soundcloud: null,
      youtube: null,
      youtubechannel: null,
      wikipedia: null
    };

    // Mock the OpenAI response
    const mockOpenAIResponse = {
      output_text: 'Generated bio text'
    };

    // Import mocked modules
    const { openai } = await import('@/server/lib/openai');
    const { getArtistById } = await import('@/server/utils/queries/artistQueries');
    
    // Setup mocks
    (getArtistById as jest.MockedFunction<typeof getArtistById>).mockResolvedValue(mockArtist);
    (openai.responses.create as jest.MockedFunction<typeof openai.responses.create>).mockResolvedValue(mockOpenAIResponse);

    // Import and call the function
    const { getOpenAIBio } = await import('@/server/utils/queries/artistBioQuery');
    const result = await getOpenAIBio('test-id');

    // Verify the OpenAI call was made with the default model
    expect(openai.responses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-5-nano', // Default value
        prompt: expect.objectContaining({
          id: expect.any(String),
          variables: expect.objectContaining({
            artist_name: 'Test Artist',
            artist_data: expect.any(String)
          })
        })
      })
    );

    // Verify NextResponse.json was called with the bio
    expect(mockNextResponseJson).toHaveBeenCalledWith({ bio: 'Generated bio text' });
  });
});
