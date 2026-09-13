import { extractInProcessAddress, inProcessProfileUrl } from '@/lib/inprocessTimeline';
import { fetchArtistTimeline } from '@/server/utils/inprocess/fetchArtistTimeline';
import TimelineCards from './TimelineCards';

/**
 * The Timeline section: an artist's In Process moments, read-only. Rendered from
 * page.tsx behind Suspense (In Process answers in seconds cold) and only when the
 * artist has an In Process link. Absent, not empty, when there is nothing to show,
 * so a broken In Process response never leaves an empty panel on the profile.
 *
 * Tracking issue: xdjs/MusicNerdWeb#1228. Design: docs/rnd/design/2026-09-10-timeline-section/.
 */
export default async function TimelineSection({ inprocess }: { inprocess: string }) {
    // artists.inprocess stores the bare 0x address (the urlmap capture group).
    const address = extractInProcessAddress(inprocess);
    if (!address) return null;
    const moments = await fetchArtistTimeline(address);
    if (moments.length === 0) return null;
    return <TimelineCards moments={moments} timelineUrl={inProcessProfileUrl(address)} />;
}
