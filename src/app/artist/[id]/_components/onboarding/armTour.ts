import { tourPendingKey } from "@/app/artist/[id]/_components/onboarding/tourPendingKey";

// A mounted tour also needs an event: router.refresh() need not remount it.
export const TOUR_ARMED_EVENT = "mn-tour-armed";

export function armTour(artistId: string): void {
    try {
        sessionStorage.setItem(tourPendingKey(artistId), "1");
    } catch { /* private mode */ }
    window.dispatchEvent(new CustomEvent(TOUR_ARMED_EVENT, { detail: artistId }));
}
