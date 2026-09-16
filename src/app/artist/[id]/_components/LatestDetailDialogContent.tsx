import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

/** Shared expanded non-release update used by artist and user profiles. */
export default function LatestDetailDialogContent({ artwork, category, title, description, text, sourceUrl, sourceLabel, footer }: {
    artwork: ReactNode; category: string; title: string; description: string; text: string; sourceUrl?: string | null; sourceLabel?: string; footer?: ReactNode;
}) {
    return <DialogContent className="mn-themed-dialog max-h-[90dvh] w-[calc(100%_-_2rem)] overflow-y-auto rounded-2xl border-white/15 bg-neutral-950/80 bg-gradient-to-br from-white/[0.08] via-transparent to-white/[0.02] p-0 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl backdrop-saturate-150 dark:bg-neutral-950/80">
        <div className="relative h-56 overflow-hidden rounded-t-2xl">{artwork}<span className="absolute bottom-4 left-5 text-xs font-semibold uppercase tracking-widest text-pink-200">{category}</span></div>
        <div className="space-y-4 px-5 pb-6">
            <DialogTitle className="pr-3 text-xl leading-snug">{title}</DialogTitle>
            <DialogDescription className="text-muted-foreground">{description}</DialogDescription>
            <p className="whitespace-pre-wrap break-words text-sm leading-7 text-foreground">{text}</p>
            {sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-pastypink/40 bg-pastypink/10 px-4 py-2 text-sm font-semibold text-pastypink hover:bg-pastypink/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pastypink">{sourceLabel || "View original source"}<ArrowUpRight size={14} aria-hidden="true" /></a>}
            {footer}
        </div>
    </DialogContent>;
}
