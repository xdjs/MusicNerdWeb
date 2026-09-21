import { isExcludedLoreDiscoveryUrl } from '../isExcludedLoreDiscoveryUrl';
it.each([
 'https://linkedin.com/in/artist', 'https://www.linkedin.com/company/music',
 'https://uk.linkedin.com/in/namesake', 'https://LINKEDIN.COM./feed/update/123',
 'https://lnkd.in/abc', 'http://www.lnkd.in./abc',
])('excludes automatic LinkedIn source %s', url => expect(isExcludedLoreDiscoveryUrl(url)).toBe(true));
it.each([
 'https://example.com/interview?ref=linkedin.com', 'https://notlinkedin.com/interview',
 'https://linkedin.com.example.org/article', 'https://example.com/linkedin.com',
 'https://linkedin.com@example.com/interview', 'not a URL',
])('does not exclude unrelated URL %s', url => expect(isExcludedLoreDiscoveryUrl(url)).toBe(false));
