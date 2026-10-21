import { isThumbnailPreviewTest } from '../isThumbnailPreviewTest';

describe('temporary thumbnail preview scope', () => {
  const saved = { ...process.env };
  const artistId = '00000000-0000-4000-8000-000000000001';
  const url = 'https://example.com/test-page';
  beforeEach(() => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_REF = 'codex/1583-suggestion-routing';
    process.env.MN_THUMBNAIL_TEST_SCOPE = JSON.stringify({ artistId, url, expiresAt: Date.now() + 60000 });
  });
  afterEach(() => { process.env = { ...saved }; });
  it('matches only the exact temporary source', () => {
    expect(isThumbnailPreviewTest(artistId, url)).toBe(true);
    expect(isThumbnailPreviewTest('other-artist', url)).toBe(false);
    expect(isThumbnailPreviewTest(artistId, url + '/other')).toBe(false);
    expect(isThumbnailPreviewTest(artistId, undefined)).toBe(false);
  });
  it.each(['production', 'development', undefined])('never activates in %s', environment => {
    if (environment) process.env.VERCEL_ENV = environment; else delete process.env.VERCEL_ENV;
    expect(isThumbnailPreviewTest(artistId, url)).toBe(false);
  });
  it('rejects another branch', () => {
    process.env.VERCEL_GIT_COMMIT_REF = 'main';
    expect(isThumbnailPreviewTest(artistId, url)).toBe(false);
  });
  it.each(['', 'bad json', '{}'])('fails closed for invalid config %s', config => {
    process.env.MN_THUMBNAIL_TEST_SCOPE = config;
    expect(isThumbnailPreviewTest(artistId, url)).toBe(false);
  });
  it.each([-1, 25 * 60 * 60 * 1000])('rejects expired or overlong window %s', offset => {
    process.env.MN_THUMBNAIL_TEST_SCOPE = JSON.stringify({ artistId, url, expiresAt: Date.now() + offset });
    expect(isThumbnailPreviewTest(artistId, url)).toBe(false);
  });
  it('keeps exact-source cleanup free of AI after expiry', () => {
    process.env.MN_THUMBNAIL_TEST_SCOPE = JSON.stringify({ artistId, url, expiresAt: Date.now() - 1000 });
    expect(isThumbnailPreviewTest(artistId, url, true)).toBe(true);
    expect(isThumbnailPreviewTest('other', url, true)).toBe(false);
  });
});
