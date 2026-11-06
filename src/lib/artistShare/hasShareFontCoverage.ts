import { shareFontCoverage } from '@/lib/artistShare/shareFontCoverage';

export function hasShareFontCoverage(text: string): boolean {
    return Array.from(text).every(character => {
        const point = character.codePointAt(0)!;
        return point >= 32 && shareFontCoverage.some(([start, end]) => point >= start && point <= end);
    });
}
