import type { ArtistLatestItem } from '@/lib/artistLatest';
import { MOMENT_KIND_LABELS, type Moment } from '@/lib/inprocessTimeline';

/** An In Process moment as a Latest card: the artist's description is the text (the media type when they wrote none), the moment's own page is its source, and the media type rides along for the badge. */
export function momentToLatestItem(moment: Moment): ArtistLatestItem {
    return {
        id: `moment:${moment.id}`,
        kind: 'moment',
        momentKind: moment.kind,
        title: moment.title,
        text: moment.description ?? `${MOMENT_KIND_LABELS[moment.kind]} on In Process`,
        date: moment.createdAt,
        imageUrl: moment.imageUrl,
        imageCaption: `${moment.title} artwork`,
        sourceUrl: moment.url,
        sourceLabel: 'Open on In Process',
    };
}
