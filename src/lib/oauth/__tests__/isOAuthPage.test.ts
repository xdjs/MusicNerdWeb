import { isOAuthPage } from '../isOAuthPage';

it.each(['/oauth/authorize', '/oauth/connections'])('is true on %s', (path) => {
  expect(isOAuthPage(path)).toBe(true);
});

it.each(['/', '/artist/abc', '/oauthx', null])('is false on %s', (path) => {
  expect(isOAuthPage(path)).toBe(false);
});
