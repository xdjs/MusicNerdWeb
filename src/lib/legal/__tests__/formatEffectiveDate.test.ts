import { formatEffectiveDate } from '../formatEffectiveDate';

describe('formatEffectiveDate', () => {
  it('spells out an ISO date', () => {
    expect(formatEffectiveDate('2026-10-08')).toBe('October 8, 2026');
  });

  it('reads the same day in every timezone', () => {
    // Midnight UTC is still the previous evening in the Americas; the page must
    // not show October 7 to a visitor in Los Angeles.
    expect(formatEffectiveDate('2026-01-01')).toBe('January 1, 2026');
  });
});
