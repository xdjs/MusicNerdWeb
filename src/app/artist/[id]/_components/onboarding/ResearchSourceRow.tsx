import type { SourceView } from "@/lib/onboarding/buildStages";
import { sourceDomain } from "@/lib/onboarding/sourceDomain";
import ResearchAvatar from "./ResearchAvatar";

/** A saved source without a share image, as one compact row: a letter, the
 *  title, and the domain. Opens the source. */
export default function ResearchSourceRow({ source }: { source: SourceView }) {
    const domain = sourceDomain(source.url);
    return (
        <li className="min-w-0">
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg py-1 transition-colors hover:text-foreground">
                <ResearchAvatar images={[]} letter={domain.charAt(0)} className="h-6 w-6 text-xs" />
                <span className="min-w-0 flex-grow truncate text-sm text-foreground">{source.title ?? domain}</span>
                <span className="hidden flex-shrink-0 font-mono text-xs text-[hsl(var(--muted-foreground))] sm:inline">{domain}</span>
            </a>
        </li>
    );
}
