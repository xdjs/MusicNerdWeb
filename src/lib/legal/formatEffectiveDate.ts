/**
 * "2026-10-08" → "October 8, 2026". Formatted in UTC so the date on the Terms
 * and Privacy pages does not slip a day for visitors west of Greenwich.
 */
export function formatEffectiveDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
