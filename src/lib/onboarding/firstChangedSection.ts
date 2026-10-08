/** Where "See what we found" takes the artist: the first section, in page
 *  order below the hero, that research changed; the About if nothing else did. */
export function firstChangedSection(newLinks: number, newSources: number): "mn-links" | "mn-lore" | "mn-about" {
    if (newLinks > 0) return "mn-links";
    if (newSources > 0) return "mn-lore";
    return "mn-about";
}
