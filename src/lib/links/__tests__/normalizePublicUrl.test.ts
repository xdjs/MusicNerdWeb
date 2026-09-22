import { normalizePublicUrl } from '../normalizePublicUrl';
it.each([
  [' jordanreinmusic.com ', 'https://jordanreinmusic.com'],
  ['www.jordanreinmusic.com/music?a=1#listen', 'https://www.jordanreinmusic.com/music?a=1#listen'],
  ['http://artist.example/a%2Fb?q=x%26y', 'http://artist.example/a%2Fb?q=x%26y'],
  ['https://artist.example', 'https://artist.example'],
])('normalizes %s without changing its destination', (input, expected) => {
  expect(normalizePublicUrl(input)).toBe(expected);
});
it.each(['', 'not a domain', 'localhost', 'https:artist.example', 'https:///artist.example', 'https://-bad.example', 'https://a..com', 'javascript:alert(1)', 'data:text/plain,test', 'ftp://artist.example', '//artist.example', 'https://user:pass@artist.example'])('rejects invalid input %s', input => {
  expect(normalizePublicUrl(input)).toBeNull();
});
