export type AnswerCitationMarker = {
  start: number;
  end: number;
  numbers: number[];
};

/** Find citation-only brackets, leaving ordinary bracketed prose and dates untouched. */
export function parseAnswerCitationMarkers(text: string): AnswerCitationMarker[] {
  const markers: AnswerCitationMarker[] = [];
  for (const match of text.matchAll(/\[([^\]]{1,60})\]/g)) {
    const parts = match[1].split(",").map(part => part.trim());
    if (!parts.every(part => /^\d+$/.test(part) || /^Artist Doc$/i.test(part))) continue;
    const start = match.index ?? 0;
    markers.push({
      start,
      end: start + match[0].length,
      numbers: parts.flatMap(part => {
        if (!/^\d+$/.test(part)) return [];
        const number = Number(part);
        return Number.isSafeInteger(number) && number > 0 ? [number] : [];
      }),
    });
  }
  return markers;
}
