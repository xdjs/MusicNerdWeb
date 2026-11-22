/**
 * A date as "Nov 21", with the year only when it is not this year.
 *
 * @param iso - An ISO timestamp from MusicNerdAPI.
 * @param now - Today, for the year check.
 * @returns The short date in the member's time zone.
 */
export function formatShortDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  });
}
