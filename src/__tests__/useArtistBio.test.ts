import { renderHook, waitFor } from '@testing-library/react';
import { useArtistBio } from '@/hooks/useArtistBio';

// Mock fetch
global.fetch = jest.fn();

describe('useArtistBio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear localStorage
    localStorage.clear();
  });

  it('should fetch bio on first call', async () => {
    const mockBio = 'Test artist bio';
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ bio: mockBio }),
    });

    const { result } = renderHook(() => useArtistBio('test-artist-id'));

    expect(result.current.loading).toBe(true);
    expect(result.current.bio).toBeUndefined();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.bio).toBe(mockBio);
    expect(fetch).toHaveBeenCalledWith('/api/artistBio/test-artist-id');
  });

  it('should use cached bio on subsequent calls', async () => {
    const mockBio = 'Test artist bio';
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ bio: mockBio }),
    });

    // First call
    const { result: result1 } = renderHook(() => useArtistBio('test-artist-id'));
    await waitFor(() => {
      expect(result1.current.loading).toBe(false);
    });

    // Second call - should use cache
    const { result: result2 } = renderHook(() => useArtistBio('test-artist-id'));
    
    expect(result2.current.bio).toBe(mockBio);
    expect(result2.current.loading).toBe(false);
    
    // Should only have called fetch once
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should handle fetch errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useArtistBio('test-artist-id'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.bio).toBe('Failed to load summary.');
    expect(result.current.error).toBe('Network error');
  });
});
