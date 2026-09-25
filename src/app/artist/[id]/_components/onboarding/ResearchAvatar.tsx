"use client";

import { useState } from "react";

export type AvatarImage = { src: string | null; inset?: boolean };

/** A round image on the research view that falls back in order: each image
 *  that is missing or fails to load gives way to the next, and the last resort
 *  is a letter on a neutral circle. `inset` images (a platform logo) sit
 *  padded inside the circle rather than filling it. Decorative: the name
 *  beside it says what it is. */
export default function ResearchAvatar({ images, letter, className = "h-11 w-11" }: {
    images: AvatarImage[];
    letter: string;
    className?: string;
}) {
    const usable = images.filter((i): i is { src: string; inset?: boolean } => !!i.src);
    const [failed, setFailed] = useState(0);
    const image = usable[failed];
    return (
        <span className={`flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-background ring-1 ring-border ${className}`}>
            {image ? (
                // eslint-disable-next-line @next/next/no-img-element -- third-party profile and share images, any host
                <img
                    src={image.src}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={() => setFailed(n => n + 1)}
                    className={image.inset ? "h-1/2 w-1/2 object-contain" : "h-full w-full object-cover"}
                />
            ) : (
                <span aria-hidden="true" className="text-sm font-medium lowercase text-[hsl(var(--muted-foreground))]">{letter}</span>
            )}
        </span>
    );
}
