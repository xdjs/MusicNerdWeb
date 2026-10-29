import { withQuery } from '../withQuery';

it('appends only the non-empty parameters', () => {
  expect(withQuery('/api/admin/activity', { query: 'a b', action: '', page: '2' })).toBe('/api/admin/activity?query=a+b&page=2');
});

it('returns the bare path when every parameter is empty', () => {
  expect(withQuery('/api/admin/review-queue', { query: '' })).toBe('/api/admin/review-queue');
});
