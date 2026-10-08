/** "1 profile", "9 profiles": a count with its noun, plural unless one. */
export function countLabel(n: number, one: string): string {
    return `${n} ${one}${n === 1 ? "" : "s"}`;
}
