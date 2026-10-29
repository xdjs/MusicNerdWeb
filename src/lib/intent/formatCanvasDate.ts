/** Human-readable UTC dates; preserve year-only and uncertain ranges verbatim. */
export function formatCanvasDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
}
