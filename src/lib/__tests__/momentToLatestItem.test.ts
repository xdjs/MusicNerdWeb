import { momentToLatestItem } from '@/lib/momentToLatestItem';
import type { Moment } from '@/lib/inprocessTimeline';

const moment: Moment = {
    id: 'a04b2285-fd7a-4159-a59d-bf1f4348cc6d',
    title: 'studio session 09',
    kind: 'video',
    imageUrl: 'https://arweave.net/abc',
    createdAt: '2026-09-09T13:08:00+00:00',
    url: 'https://www.inprocess.world/collect/base:0xabc/75',
    description: 'If you watch the full 15 minutes, you\'ll recognize the visual theme.',
};

it('projects a moment onto the Latest card shape with a namespaced id and the moment page as its source', () => {
    expect(momentToLatestItem(moment)).toEqual({
        id: `moment:${moment.id}`,
        kind: 'moment',
        momentKind: 'video',
        title: moment.title,
        text: moment.description,
        date: moment.createdAt,
        imageUrl: moment.imageUrl,
        imageCaption: `${moment.title} artwork`,
        sourceUrl: moment.url,
        sourceLabel: 'Open on In Process',
    });
});

it('keeps a missing artwork as null and names the media type when the artist wrote no description', () => {
    expect(momentToLatestItem({ ...moment, kind: 'writing', imageUrl: null, description: null })).toMatchObject({ imageUrl: null, momentKind: 'writing', text: 'Writing on In Process' });
});
