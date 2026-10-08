import { Skeleton } from "@/components/ui/skeleton";

export type SkeletonKind = "links" | "sources" | "about";

/**
 * The placeholder in a research section's shape while its step runs
 * (docs/research-view.md, "Sections"): profile tiles for Links, source cards
 * for Lore, three text lines for the About.
 */
export default function SkeletonShape({ kind }: { kind: SkeletonKind }) {
    if (kind === "about") {
        return (
            <div className="flex max-w-xl flex-col gap-2.5">
                {["w-[96%]", "w-[88%]", "w-[62%]"].map(width => (
                    <Skeleton key={width} data-skeleton="line" className={`h-3 bg-current opacity-25 dark:bg-current ${width}`} />
                ))}
            </div>
        );
    }
    if (kind === "sources") {
        return (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[0, 1, 2].map(i => (
                    <div key={i} data-skeleton="card" className={`overflow-hidden rounded-xl border border-black/10 dark:border-white/10 ${i > 1 ? "hidden sm:block" : ""}`}>
                        <Skeleton className="h-28 rounded-none" />
                        <div className="flex flex-col gap-2 p-3">
                            <Skeleton className="h-2.5 w-[85%] rounded" />
                            <Skeleton className="h-2.5 w-[55%] rounded" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }
    return (
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-7">
            {[0, 1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} data-skeleton="tile" className={`flex flex-col items-center gap-2 ${i > 3 ? "hidden sm:flex" : ""} ${i > 5 ? "sm:hidden md:flex" : ""}`}>
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <Skeleton className="h-2 w-12 rounded" />
                </div>
            ))}
        </div>
    );
}
