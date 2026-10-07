import { metadata } from '../page';

it('keeps /access out of search results', () => {
  expect(metadata.robots).toEqual({ index: false, follow: false });
  expect(metadata.title).toBe('Access token');
});
