import type { UIMessage } from 'ai';
import { getChatRequestMessages } from '../getChatRequestMessages';

/**
 * A units-mode conversation as useChat holds it, built from MusicNerdAPI's tool output shapes
 * (createSearchPassagesTool, createReadUnitsTool, createListDocumentsTool, createChatCitations).
 * The API's validateArtistChatBody rejects the whole body when any message has more than 64
 * parts, reads only `text` parts and completed `searchPassages` / `readUnits` / PDF read parts,
 * and keeps an answer's document numbers from `output.documents`.
 */
const MAX_PARTS = 64;
const uuid = (i: number) => `0b6c1f9e-4d7a-4c1e-9a43-${String(i).padStart(12, '0')}`;
const ref = (n: number) => ({ n, sourceKind: 'vault', sourceId: uuid(n), revision: `rev-${n}`, title: `Doc ${n}`, url: n % 2 ? null : `https://x.example/${n}.pdf` });
const sourceUrl = (n: number) => ({ type: 'source-url', sourceId: String(n), url: ref(n).url ?? `musicnerd://vault/${uuid(n)}`, title: `Doc ${n}` });
const search = (id: string, ns: number[]) => ({
    type: 'tool-searchPassages', toolCallId: id, state: 'output-available', input: { query: 'aliases' },
    output: { results: ns.map(n => ({ n, locator: 'p.1', title: `Doc ${n}`, passage: 'x'.repeat(200) })), weak: false, truncated: false,
        documents: ns.map(n => ({ ...ref(n), units: 9, shown: 1, expanded: false })) },
});
const read = (id: string, n: number) => ({
    type: 'tool-readUnits', toolCallId: id, state: 'output-available', input: { n, locators: ['p.4'] },
    output: { n, title: `Doc ${n}`, units: [{ locator: 'p.4', text: '…' }], truncated: false, missing: [], documents: [ref(n)] },
});
const listing = {
    type: 'tool-listDocuments', toolCallId: 'l1', state: 'output-available', input: {},
    output: { documents: [{ n: 1, title: 'Doc 1', kind: 'vault', url: null, units: 9, indexing: false }] },
};
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

// Turn one numbers 1–32 in four searches; turn two re-sends all 32 as seeded source parts, then numbers 33–64.
const first: UIMessage = { id: 'a1', role: 'assistant', parts: [
    { type: 'step-start' }, search('s1', range(1, 8)), search('s2', range(9, 16)), search('s3', range(17, 24)), search('s4', range(25, 32)),
    ...range(1, 32).map(sourceUrl),
    { type: 'step-start' }, read('r1', 3), listing,
    { type: 'step-start' }, { type: 'text', text: 'Dutchy ran 2012–2019 [3, p.4] and toured [2, §Live, 1999].', state: 'done' },
] } as UIMessage;
const second: UIMessage = { id: 'a2', role: 'assistant', parts: [
    ...range(1, 32).map(sourceUrl),
    { type: 'step-start' }, search('s5', range(33, 40)), search('s6', range(41, 48)), search('s7', range(49, 56)), search('s8', range(57, 64)),
    ...range(33, 64).map(sourceUrl),
    { type: 'step-start' }, read('r2', 40),
    { type: 'step-start' }, { type: 'reasoning', text: '…' }, { type: 'text', text: 'Again [3, p.4] and [40, ¶2].', state: 'done' },
] } as UIMessage;
const user = (id: string, text: string): UIMessage => ({ id, role: 'user', parts: [{ type: 'text', text }] });
const conversation = [user('u1', 'Which years?'), first, user('u2', 'And later?'), second, user('u3', 'Anything else?')];

it('builds a follow-up a units-mode conversation would otherwise overflow', () => {
    expect(second.parts.length).toBeGreaterThan(MAX_PARTS);
    const sent = getChatRequestMessages(conversation);
    for (const message of sent) expect(message.parts.length).toBeLessThanOrEqual(MAX_PARTS);
});

it('sends every text and tool part unchanged, so the API can keep each answer\'s document numbers', () => {
    const sent = getChatRequestMessages(conversation);
    expect(sent.map(m => [m.id, m.role])).toEqual(conversation.map(m => [m.id, m.role]));
    for (const [i, message] of sent.entries()) {
        const kept = conversation[i].parts.filter(part => part.type === 'text' || part.type.startsWith('tool-'));
        expect(message.parts).toEqual(kept);
        kept.forEach((part, j) => expect(message.parts[j]).toBe(part));
    }
    const documents = sent[3].parts.flatMap(part => part.type === 'tool-searchPassages'
        ? (part as unknown as { output: { documents: { n: number }[] } }).output.documents.map(d => d.n) : []);
    expect(documents).toEqual(range(33, 64));
});

it('leaves out only the parts the API never reads: sources, step markers and reasoning', () => {
    const types = new Set(getChatRequestMessages(conversation).flatMap(m => m.parts.map(p => p.type)));
    expect([...types].sort()).toEqual(['text', 'tool-listDocuments', 'tool-readUnits', 'tool-searchPassages']);
});
