import { extractArtistId } from '../services';

// Mock getAllLinks to supply mappings for X (Twitter), Wikipedia, and Facebook links
jest.mock('../queries/queriesTS', () => ({
  getAllLinks: jest.fn().mockResolvedValue([
    {
      // Regex captures the username portion of an x.com URL, ignoring any query params
      regex: /x\.com\/([A-Za-z0-9_]+)(?:\?[^#]*)?/,
      siteName: 'x',
      cardPlatformName: 'X',
    },
    {
      // Simplified regex to capture the article slug from an English Wikipedia link
      regex: /en\.wikipedia\.org\/wiki\/([^?#/]+)/,
      siteName: 'wikipedia',
      cardPlatformName: 'Wikipedia',
    },
    {
      // Facebook regex pattern that handles all three URL formats
      regex: /^https:\/\/(?:[^\/]*\.)?facebook\.com\/(?:people\/[^\/]+\/([0-9]+)\/?|profile\.php\?id=([0-9]+)(?:&[^#]*)?|([^\/\?#]+))(?:[\?#].*)?$/,
      siteName: 'facebook',
      cardPlatformName: 'Facebook',
    },
  ]),
}));

describe('extractArtistId – X links', () => {
  it('removes query parameters following a "?"', async () => {
    const url = 'https://x.com/sugar_plant?si=21';
    const result = await extractArtistId(url);
    expect(result).not.toBeNull();
    expect(result?.id).toBe('sugar_plant');
  });

  it('returns the username unchanged when no query parameters are present', async () => {
    const url = 'https://x.com/sugar_plant';
    const result = await extractArtistId(url);
    expect(result).not.toBeNull();
    expect(result?.id).toBe('sugar_plant');
  });

  describe('percent-decoding for Wikipedia links', () => {
    it('decodes percent-encoded characters in the article slug', async () => {
      const url = 'https://en.wikipedia.org/wiki/Yun%C3%A8_Pinku';
      const result = await extractArtistId(url);
      expect(result).not.toBeNull();
      expect(result?.siteName).toBe('wikipedia');
      expect(result?.id).toBe('Yunè_Pinku');
    });
  });
});

describe('extractArtistId – Facebook links', () => {
  describe('username format', () => {
    it('extracts username from standard facebook.com URL', async () => {
      const url = 'https://www.facebook.com/tylerthecreator';
      const result = await extractArtistId(url);
      expect(result).not.toBeNull();
      expect(result?.siteName).toBe('facebook');
      expect(result?.cardPlatformName).toBe('Facebook');
      expect(result?.id).toBe('tylerthecreator');
    });

    it('extracts username from facebook.com URL without www', async () => {
      const url = 'https://facebook.com/tylerthecreator';
      const result = await extractArtistId(url);
      expect(result).not.toBeNull();
      expect(result?.siteName).toBe('facebook');
      expect(result?.id).toBe('tylerthecreator');
    });

    it('extracts username and ignores query parameters', async () => {
      const url = 'https://www.facebook.com/tylerthecreator?ref=page';
      const result = await extractArtistId(url);
      expect(result).not.toBeNull();
      expect(result?.siteName).toBe('facebook');
      expect(result?.id).toBe('tylerthecreator');
    });

    it('extracts username and ignores fragment', async () => {
      const url = 'https://www.facebook.com/tylerthecreator#posts';
      const result = await extractArtistId(url);
      expect(result).not.toBeNull();
      expect(result?.siteName).toBe('facebook');
      expect(result?.id).toBe('tylerthecreator');
    });
  });

  describe('people/name/ID format', () => {
    it('extracts ID from people format URL', async () => {
      const url = 'https://www.facebook.com/people/Angela-Bofill/100044180243805/';
      const result = await extractArtistId(url);
      expect(result).not.toBeNull();
      expect(result?.siteName).toBe('facebookID');
      expect(result?.cardPlatformName).toBe('Facebook');
      expect(result?.id).toBe('100044180243805');
    });

    it('extracts ID from people format URL without trailing slash', async () => {
      const url = 'https://www.facebook.com/people/Angela-Bofill/100044180243805';
      const result = await extractArtistId(url);
      expect(result).not.toBeNull();
      expect(result?.siteName).toBe('facebookID');
      expect(result?.id).toBe('100044180243805');
    });

    it('extracts ID from people format URL with query parameters', async () => {
      const url = 'https://www.facebook.com/people/Angela-Bofill/100044180243805/?ref=search';
      const result = await extractArtistId(url);
      expect(result).not.toBeNull();
      expect(result?.siteName).toBe('facebookID');
      expect(result?.id).toBe('100044180243805');
    });

    it('handles complex names with hyphens and numbers', async () => {
      const url = 'https://www.facebook.com/people/John-Doe-123/987654321/';
      const result = await extractArtistId(url);
      expect(result).not.toBeNull();
      expect(result?.siteName).toBe('facebookID');
      expect(result?.id).toBe('987654321');
    });
  });

  describe('profile.php?id= format', () => {
    it('extracts ID from profile.php URL', async () => {
      const url = 'https://www.facebook.com/profile.php?id=100044180243805';
      const result = await extractArtistId(url);
      expect(result).not.toBeNull();
      expect(result?.siteName).toBe('facebookID');
      expect(result?.cardPlatformName).toBe('Facebook');
      expect(result?.id).toBe('100044180243805');
    });

    it('extracts ID from profile.php URL with additional query parameters', async () => {
      const url = 'https://www.facebook.com/profile.php?id=100044180243805&ref=page&tab=about';
      const result = await extractArtistId(url);
      expect(result).not.toBeNull();
      expect(result?.siteName).toBe('facebookID');
      expect(result?.id).toBe('100044180243805');
    });

    it('extracts ID from profile.php URL with fragment', async () => {
      const url = 'https://www.facebook.com/profile.php?id=100044180243805#about';
      const result = await extractArtistId(url);
      expect(result).not.toBeNull();
      expect(result?.siteName).toBe('facebookID');
      expect(result?.id).toBe('100044180243805');
    });

    it('handles mobile Facebook URLs', async () => {
      const url = 'https://m.facebook.com/profile.php?id=100044180243805';
      const result = await extractArtistId(url);
      expect(result).not.toBeNull();
      expect(result?.siteName).toBe('facebookID');
      expect(result?.id).toBe('100044180243805');
    });
  });

  describe('edge cases and validation', () => {
    it('rejects invalid URLs that do not match Facebook patterns', async () => {
      const url = 'https://www.facebook.com/';
      const result = await extractArtistId(url);
      expect(result).toBeNull();
    });

    it('rejects URLs with invalid Facebook domains', async () => {
      const url = 'https://www.notfacebook.com/username';
      const result = await extractArtistId(url);
      expect(result).toBeNull();
    });

    it('rejects malformed profile.php URLs without ID', async () => {
      const url = 'https://www.facebook.com/profile.php';
      const result = await extractArtistId(url);
      expect(result).toBeNull();
    });

    it('rejects profile.php URLs with non-numeric IDs', async () => {
      const url = 'https://www.facebook.com/profile.php?id=notanumber';
      const result = await extractArtistId(url);
      expect(result).toBeNull();
    });

    it('rejects people URLs with non-numeric IDs', async () => {
      const url = 'https://www.facebook.com/people/John-Doe/notanumber/';
      const result = await extractArtistId(url);
      expect(result).toBeNull();
    });

    it('handles URLs with mixed case domains', async () => {
      const url = 'https://www.FACEBOOK.com/tylerthecreator';
      const result = await extractArtistId(url);
      expect(result).not.toBeNull();
      expect(result?.siteName).toBe('facebook');
      expect(result?.id).toBe('tylerthecreator');
    });
  });

  describe('subdomain variations', () => {
    it('handles various Facebook subdomains for username format', async () => {
      const subdomains = ['www', 'm', 'mobile', 'touch'];
      
      for (const subdomain of subdomains) {
        const url = `https://${subdomain}.facebook.com/tylerthecreator`;
        const result = await extractArtistId(url);
        expect(result).not.toBeNull();
        expect(result?.siteName).toBe('facebook');
        expect(result?.id).toBe('tylerthecreator');
      }
    });

    it('handles facebook.com without subdomain', async () => {
      const url = 'https://facebook.com/tylerthecreator';
      const result = await extractArtistId(url);
      expect(result).not.toBeNull();
      expect(result?.siteName).toBe('facebook');
      expect(result?.id).toBe('tylerthecreator');
    });
  });
}); 