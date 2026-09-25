import ResearchAvatar, { type AvatarImage } from "./ResearchAvatar";

/** A finished research step, collapsed: the first four of its images,
 *  overlapping. Decorative; the summary beside it carries the words. */
export default function ResearchImageStack({ entries }: {
    entries: { key: string; letter: string; images: AvatarImage[] }[];
}) {
    return (
        <span aria-hidden="true" className="flex flex-shrink-0">
            {entries.slice(0, 4).map((e, i) => (
                <ResearchAvatar key={e.key} images={e.images} letter={e.letter} className={`h-7 w-7 ring-2 ring-background ${i > 0 ? "-ml-2" : ""}`} />
            ))}
        </span>
    );
}
