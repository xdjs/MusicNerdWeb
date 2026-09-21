import { fetchPageContent } from '../fetchPageContent';

afterEach(() => jest.restoreAllMocks());
it.each([200, 403])('retains final redirect URL for an HTTP %s response', async status => {
  const finalUrl = 'https://www.linkedin.com/in/namesake';
  jest.spyOn(global, 'fetch').mockResolvedValue({ url: finalUrl, status, ok: status === 200, text: async () => '<html><title>Namesake</title><body>Public profile</body></html>' } as Response);
  const result = await fetchPageContent('https://example.org/redirect');
  expect(result.resolvedUrl).toBe(finalUrl);
  expect(result.status).toBe(status);
});
it('keeps direct manual LinkedIn content fetches working', async () => {
  const text = 'Artist-supplied professional biography. '.repeat(20);
  const url = 'https://www.linkedin.com/in/artist';
  jest.spyOn(global, 'fetch').mockResolvedValue({ url, status: 200, ok: true, text: async () => `<html><title>Artist biography</title><body><article><p>${text}</p></article></body></html>` } as Response);
  const result = await fetchPageContent(url);
  expect(result.title).toBe('Artist biography');
  expect(result.extractedText).toContain('Artist-supplied');
});
