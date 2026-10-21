import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/** Shared expanded non-release update used by artist and user profiles. */
export default function LatestDetailDialogContent({ artwork, category, title, description, text, sourceUrl, sourceLabel, footer, onCloseAutoFocus }: {
    artwork: ReactNode; category: string; title: string; description: string; text: ReactNode; sourceUrl?: string | null; sourceLabel?: string; footer?: ReactNode;
    onCloseAutoFocus?: (event: Event) => void;
}) {
    return <DialogContent onCloseAutoFocus={onCloseAutoFocus} data-analytics-surface="latest" className="block max-h-[85dvh] w-[calc(100%_-_2rem)] overflow-hidden rounded-2xl border-border p-0 text-foreground shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:rounded-2xl [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:bg-black/70 [&>button]:text-white [&>button]:opacity-100">
        <div role="region" aria-label="Update content" tabIndex={0} className="scrollbar-hide max-h-[calc(85dvh_-_2px)] overflow-y-auto overscroll-contain rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-highlightpink">
            {artwork}
            <div className="relative space-y-4 px-5 py-6">
                <span className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">{category}</span>
                <DialogTitle className="pr-3 text-xl leading-snug">{title}</DialogTitle>
                <DialogDescription className="text-muted-foreground">{description}</DialogDescription>
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-foreground">{text}</p>
                {sourceUrl && <Button asChild variant="pink" className="rounded-full"><a href={sourceUrl} target="_blank" rel="noopener noreferrer">{sourceLabel || "View original source"}<ArrowUpRight size={14} aria-hidden="true" /></a></Button>}
                {footer && <div className="[&>a]:border-border [&>a]:text-foreground [&>p]:text-muted-foreground">{footer}</div>}
            </div>
        </div>
    </DialogContent>;
}
