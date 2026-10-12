import { projectUnclaimedProfile } from '../projectUnclaimedProfile';

describe('pre-claim public profile projection', () => {
  const artist = { id: 'a', bio: 'Private prepared biography', spotify: 'sp' };
  const sources = [
    { id: 'link', url: 'https://music.apple.com/us/artist/example/123', status: 'approved', type: 'profile', title: 'Artist', snippet: 'Private interpretation', extractedText: 'Private original' },
    { id: 'lore', url: 'https://example.org/interview', status: 'approved', type: 'article', title: 'Private interview', extractedText: 'Secret original' },
  ];
  it('handles scheme-less website destinations without exposing prepared text', () => {
    const result = projectUnclaimedProfile(artist, [{ url: 'example.org', type: 'website', snippet: 'Private narrative' }]);
    expect(result.sources[0]).toMatchObject({ title: 'example.org', snippet: null });
  });
  it('keeps destinations while removing biography, lore and source contents', () => {
    const result = projectUnclaimedProfile(artist, sources);
    expect(result.artist).toEqual({ id: 'a', bio: null, spotify: 'sp' });
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]).toMatchObject({ id: 'link', snippet: null, extractedText: null });
    expect(JSON.stringify(result)).not.toMatch(/Private|Secret/);
    expect(artist.bio).toBe('Private prepared biography');
  });
});
