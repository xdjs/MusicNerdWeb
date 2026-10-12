/** Format database timestamps without relying on browser-specific string parsing. */
export function formatClaimDate(value: string | null | undefined): string {
    const fallback = 'Date unavailable';
    const parts = value?.trim().match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(?:Z|([+-])(\d{2})(?::?(\d{2}))?)?$/);
    if (!parts) return fallback;
    const [, year, month, day, hour, minute, second, fraction, sign, offsetHour, offsetMinute] = parts;
    const fields = [year, month, day, hour, minute, second].map(Number);
    const [y, m, d, h, min, s] = fields;
    const offsetH = Number(offsetHour ?? 0);
    const offsetM = Number(offsetMinute ?? 0);
    if (offsetH > 23 || offsetM > 59) return fallback;
    // Setting UTC fields avoids both permissive Date.parse and the 1900 adjustment
    // Date.UTC applies to years below 100. Validate calendar rollover before offsetting.
    const date = new Date(0);
    date.setUTCFullYear(y, m - 1, d);
    date.setUTCHours(h, min, s, Number((fraction ?? '').padEnd(3, '0').slice(0, 3)));
    const actual = [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()];
    if (actual.some((field, index) => field !== fields[index])) return fallback;
    const offset = (offsetH * 60 + offsetM) * (sign === '-' ? -1 : 1);
    date.setTime(date.getTime() - offset * 60_000);
    const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s([AP]M)$/i, '\u00A0$1');
    return `${date.toLocaleDateString()} ${time}`;
}
