import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/** Shared expanded non-release update used by artist and user profiles. */
export default function LatestDetailDialogContent({ artwork, category, title, description, text, sourceUrl, sourceLabel, footer, onCloseAutoFocus }: {
    artwork: ReactNode; category: string; title: string; description: string; text: ReactNode; sourceUrl?: string | null; sourceLabel?: string; footer?: ReactNode;
    onCloseAutoFocus?: (event: Event) => void;
}) {
    return <DialogContent onCloseAutoFocus={onCloseAutoFocus} data-analytics-surface="latest" className="mn-themed-dialog max-h-[90dvh] w-[calc(100%_-_2rem)] overflow-y-auto rounded-2xl border-white/15 bg-neutral-950/80 bg-gradient-to-br from-white/[0.08] via-transparent to-white/[0.02] p-0 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl backdrop-saturate-150 dark:bg-neutral-950/80 [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:bg-black/70 [&>button]:text-white [&>button]:opacity-100">
        <div className="relative overflow-hidden rounded-t-2xl bg-[#000]">{artwork}</div>
        <div className="space-y-4 px-5 pb-6 pt-5">
            <span className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">{category}</span>
            <DialogTitle className="pr-3 text-xl leading-snug">{title}</DialogTitle>
            <DialogDescription className="text-muted-foreground">{description}</DialogDescription>
            <p className="whitespace-pre-wrap break-words text-sm leading-7 text-foreground">{text}</p>
            {sourceUrl && <Button asChild variant="pink" className="rounded-full"><a href={sourceUrl} target="_blank" rel="noopener noreferrer">{sourceLabel || "View original source"}<ArrowUpRight size={14} aria-hidden="true" /></a></Button>}
            {footer}
        </div>
    </DialogContent>;
}
