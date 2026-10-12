import { formatClaimDate } from '../formatClaimDate';

const displayed = (iso: string) => {
    const date = new Date(iso);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s([AP]M)$/i, '\u00A0$1')}`;
};

it.each([
    ['2026-10-11 12:34:56.123456+00', '2026-10-11T12:34:56.123Z'],
    ['2026-10-11 12:34:56+05', '2026-10-11T07:34:56Z'],
    ['2026-10-11T12:34:56.1+05:30', '2026-10-11T07:04:56.100Z'],
    ['2026-10-11T12:34:56-0430', '2026-10-11T17:04:56Z'],
    ['2026-10-11T12:34:56.123Z', '2026-10-11T12:34:56.123Z'],
    ['2026-10-11 12:34:56', '2026-10-11T12:34:56Z'],
    ['2024-02-29 00:00:00+00', '2024-02-29T00:00:00Z'],
])('formats %s without losing its timezone', (value, iso) => {
    expect(formatClaimDate(value)).toBe(displayed(iso));
});

it.each([null, undefined, '', 'nonsense', '2026-02-30 12:00:00+00', '2026-13-01 00:00:00', '2026-10-11T24:00:00Z', '2026-10-11T12:00:00+25', '2026-10-11T12:00:00+0560', '2026-10-11 12:00:00+00Z'])('uses one readable fallback for %s', value => {
    expect(formatClaimDate(value)).toBe('Date unavailable');
});
