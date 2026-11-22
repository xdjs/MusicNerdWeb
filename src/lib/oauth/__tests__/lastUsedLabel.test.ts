import { lastUsedLabel } from '../lastUsedLabel';

const now = new Date(2026, 10, 22, 12, 0);
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

it('says when the agent has not been used yet', () => {
  expect(lastUsedLabel(null, now)).toBe('Not used yet');
});

it.each([
  [0, 'Last used just now'],
  [5, 'Last used 5 min ago'],
  [59, 'Last used 59 min ago'],
  [60, 'Last used 1 hour ago'],
  [180, 'Last used 3 hours ago'],
  [13 * 60, 'Last used yesterday'],
  [3 * 24 * 60, 'Last used Nov 19'],
])('%i minutes ago reads "%s"', (minutes, label) => {
  expect(lastUsedLabel(ago(minutes), now)).toBe(label);
});
