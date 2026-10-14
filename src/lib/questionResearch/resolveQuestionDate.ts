const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
/** A single named calendar day is exact. An omitted year means its latest past occurrence. */
export function resolveQuestionDate(question: string, currentDate: string): string | undefined {
  // Ranges, comparisons, future dates and historical context need the planner's full interpretation.
  if (/\b(?:through|until|before|after|since|next|upcoming|future|compare)\b/i.test(question)) return undefined;
  const pattern = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/gi;
  const dates = [...question.matchAll(pattern)];
  if (dates.length !== 1 || /\d\s*[-–]\s*\d/.test(question)) return undefined;
  const [, monthName, dayText, explicitYear] = dates[0];
  const month = months.indexOf(monthName.toLowerCase()) + 1;
  let year = explicitYear ? Number(explicitYear) : Number(currentDate.slice(0, 4));
  // A different explicit year elsewhere in the request can define historical context.
  const years = question.match(/\b(?:19|20)\d{2}\b/g) ?? [];
  if (!explicitYear && years.length) return undefined;
  const suffix = `-${String(month).padStart(2, "0")}-${dayText.padStart(2, "0")}`;
  if (!explicitYear && `${year}${suffix}` > currentDate) year--;
  const value = `${year}${suffix}`;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : undefined;
}
