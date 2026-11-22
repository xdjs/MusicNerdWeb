import { formatShortDate } from '../formatShortDate';

const now = new Date(2026, 10, 22, 12, 0);

it('shows month and day within the current year', () => {
  expect(formatShortDate(new Date(2026, 10, 21, 9, 30).toISOString(), now)).toBe('Nov 21');
});

it('adds the year for another year', () => {
  expect(formatShortDate(new Date(2025, 11, 30, 9, 30).toISOString(), now)).toBe('Dec 30, 2025');
});
