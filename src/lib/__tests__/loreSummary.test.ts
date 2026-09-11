import { currentLoreSummary, loreSourceKey } from '../loreSummary';

const sources = [{ id: 'document', title: 'Studio journal', type: 'document' }, { id: 'audio', title: 'Conversation', type: 'audio' }];
const summary = { text: 'A studio journal and a recorded conversation.', sourceKey: loreSourceKey(sources) };

it('keeps the summary when the same approved sources change display order', () => {
    expect(currentLoreSummary(summary, [...sources].reverse())).toBe(summary.text);
});
it('hides stale summaries after removal, rename, reclassification, or approval of a new source', () => {
    for (const changed of [[], sources.slice(1), [{ ...sources[0], title: 'Revised' }, sources[1]], [{ ...sources[0], type: 'article' }, sources[1]], [...sources, { id: 'new' }]]) {
        expect(currentLoreSummary(summary, changed)).toBeNull();
    }
});
it('rejects missing or invalid summary values', () => {
    for (const value of [null, [], { sourceKey: summary.sourceKey }, { ...summary, text: '' }, { ...summary, text: 'x'.repeat(901) }]) {
        expect(currentLoreSummary(value, sources)).toBeNull();
    }
});
