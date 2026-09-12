import type { ReactNode } from 'react';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ProfileLink } from '@/lib/artistProfileLinks';
import ListeningLinks from './ListeningLinks';

/** The same compact service picker for an artist or a specific release. */
export default function ListeningDialogContent({ title, description, links, artwork, release = false }: {
    title: string; description: string; links: ProfileLink[]; artwork?: ReactNode; release?: boolean;
}) {
    return <DialogContent className="max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-2xl border-white/10 bg-neutral-950/90 p-5 text-white shadow-2xl backdrop-blur-2xl dark:bg-neutral-950/90 sm:rounded-2xl sm:p-6">
        <div className="flex items-center gap-4 pr-5">
            {artwork}
            <DialogHeader className="min-w-0 text-left">
                <DialogTitle className="text-xl font-semibold tracking-tight">{title}</DialogTitle>
                <DialogDescription className="text-white/55">{description}</DialogDescription>
            </DialogHeader>
        </div>
        <ListeningLinks links={links} release={release} />
    </DialogContent>;
}
