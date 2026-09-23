import { foldName } from "@/server/utils/nameFold";

/** Words a handle may leave out of a name: "blackkeys" is The Black Keys. */
const OPTIONAL_WORDS = new Set(["the", "a", "an", "and"]);

/** Digit-for-letter spelling (`p3t3rango` for "Pete Rango"), undone so the handle can
 *  be compared: handles take it up precisely because the plain name was taken. */
function deleet(s: string): string {
    return s.replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s").replace(/7/g, "t");
}

/**
 * The primary identity signal for a profile a web search returned: does the HANDLE
 * carry every word of the artist's name (folded, articles optional, digit-for-letter
 * spelling allowed)? Extra characters are fine (`peterangomusic`); missing words are
 * not. The check this replaces also accepted a handle contained IN the name, and on
 * #1340's Exa run that admitted Lee Brice's accounts for "Sherwinn Dupes Brice":
 * a handle that is one word of a longer name is a namesake as often as not.
 */
export function handleCoversArtistName(handle: string, artistName: string): boolean {
    const words = artistName.split(/\s+/).map(foldName).filter(w => w && !OPTIONAL_WORDS.has(w));
    if (words.length === 0) return false;
    return [foldName(handle), foldName(deleet(handle))].some(h => !!h && words.every(w => h.includes(w)));
}
