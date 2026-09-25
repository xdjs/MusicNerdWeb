/** A one-line summary of a finished step: the first few names, then how many
 *  more ("spotify, youtube, bandcamp, soundcloud and 3 more"). */
export function listSummary(names: string[], named = 4): string {
    const shown = names.slice(0, named);
    const rest = names.length - shown.length;
    if (rest > 0) return `${shown.join(", ")} and ${rest} more`;
    if (shown.length < 2) return shown.join("");
    return `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
}
