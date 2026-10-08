/** What the page shows now that it didn't when the build view mounted
 *  (docs/research-view.md, "What counts as new"), in page order. */
export function newKeys(baseline: string[], current: string[]): string[] {
    return current.filter(key => !baseline.includes(key));
}
