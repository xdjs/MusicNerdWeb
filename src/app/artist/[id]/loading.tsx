import { Skeleton } from '@/components/ui/skeleton';

/** Route-level feedback appears before profile reads or background discovery finish. */
export default function ArtistLoading() {
    return (
        <div role="status" aria-live="polite" aria-label="Loading artist profile" className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
            <p className="text-sm text-muted-foreground">Loading artist profile…</p>
            <div aria-hidden="true" className="space-y-6">
                <Skeleton className="h-64 w-full rounded-3xl sm:h-80" />
                <Skeleton className="h-10 w-2/3 max-w-md" />
                <Skeleton className="h-14 w-full rounded-2xl" />
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <Skeleton className="h-52 rounded-3xl" />
                    <Skeleton className="h-52 rounded-3xl" />
                    <Skeleton className="hidden h-52 rounded-3xl sm:block" />
                </div>
            </div>
        </div>
    );
}
