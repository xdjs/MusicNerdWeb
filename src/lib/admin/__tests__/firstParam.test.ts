import { firstParam } from '../firstParam';

it('reads the first value of a search parameter', () => {
  expect(firstParam('a')).toBe('a');
  expect(firstParam(['b', 'c'])).toBe('b');
  expect(firstParam(undefined)).toBe('');
});
