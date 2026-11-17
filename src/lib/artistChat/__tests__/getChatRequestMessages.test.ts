import type { UIMessage } from 'ai';
import { getChatRequestMessages } from '../getChatRequestMessages';

/**
 * A units-mode conversation as useChat holds it, built from MusicNerdAPI's tool output shapes
 * (createSearchPassagesTool, createReadUnitsTool, createListDocumentsTool, createChatCitations).
 * The API's validateArtistChatBody rejects the whole body when any message has more than 64
 * parts, reads only `text` parts and completed `searchPassages` / `readUnits` / PDF read parts,
 * and keeps an answer's document numbers from `output.documents` (`citedDocuments`), telling a
 * refused search by `"error" in output` and a read that returned units by `"units" in output`.
 */
const MAX_PARTS = 64;
const UNIT = 'u'.repeat(6000);
const uuid = (i: number) => `0b6c1f9e-4d7a-4c1e-9a43-${String(i).padStart(12, '0')}`;
const ref = (n: number) => ({ n, sourceKind: 'vault', sourceId: uuid(n), revision: `rev-${n}`, title: `Doc ${n}`, url: n % 2 ? null : `https://x.example/${n}.pdf` });
const sourceUrl = (n: number) => ({ type: 'source-url', sourceId: String(n), url: ref(n).url ?? `musicnerd://vault/${uuid(n)}`, title: `Doc ${n}` });
const search = (id: string, ns: number[]) => ({
    type: 'tool-searchPassages', toolCallId: id, state: 'output-available', input: { query: 'aliases' },
    output: { results: ns.map(n => ({ n, locator: 'p.1', title: `Doc ${n}`, passage: UNIT })), weak: false, truncated: false,
        documents: ns.map(n => ({ ...ref(n), units: 9, shown: 1, expanded: false })) },
});
const refused = { type: 'tool-searchPassages', toolCallId: 'sx', state: 'output-available', input: { query: 'more' },
    output: { error: 'Search limit reached for this answer', results: [], documents: [] } };
const read = (id: string, n: number) => ({
    type: 'tool-readUnits', toolCallId: id, state: 'output-available', input: { n, locators: ['p.4', 'p.5'] },
    output: { n, title: `Doc ${n}`, units: [{ locator: 'p.4', text: UNIT }, { locator: 'p.5', text: UNIT }], truncated: false, missing: [], documents: [ref(n)] },
});
const failedRead = { type: 'tool-readUnits', toolCallId: 'rx', state: 'output-available', input: { n: 99 }, output: { error: 'Unknown document number' } };
const listing = {
    type: 'tool-listDocuments', toolCallId: 'l1', state: 'output-available', input: {},
    output: { documents: [{ n: 1, title: 'Doc 1', kind: 'vault', url: null, units: 9, indexing: false }] },
};
const webSearch = { type: 'tool-webSearch', toolCallId: 'w1', state: 'output-available', input: { query: 'q' },
    output: { results: [{ n: 65, title: 'News', url: 'https://news.example/a', snippet: 'x'.repeat(500) }] } };
const readSource = { type: 'tool-readSource', toolCallId: 'rs1', state: 'output-available', input: { sourceId: 'latest:1' },
    output: { n: 66, title: 'Release', url: 'https://x.example/r', text: 'y'.repeat(800) } };
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

// Turn one numbers 1–32 in four searches; turn two re-sends all 32 as seeded source parts, then numbers 33–64.
const first: UIMessage = { id: 'a1', role: 'assistant', parts: [
    { type: 'step-start' }, search('s1', range(1, 8)), search('s2', range(9, 16)), search('s3', range(17, 24)), search('s4', range(25, 32)),
    ...range(1, 32).map(sourceUrl),
    { type: 'step-start' }, read('r1', 3), listing, refused,
    { type: 'step-start' }, { type: 'text', text: 'Dutchy ran 2012–2019 [3, p.4] and toured [2, §Live, 1999].', state: 'done' },
] } as UIMessage;
const second: UIMessage = { id: 'a2', role: 'assistant', parts: [
    ...range(1, 32).map(sourceUrl),
    { type: 'step-start' }, search('s5', range(33, 40)), search('s6', range(41, 48)), search('s7', range(49, 56)), search('s8', range(57, 64)),
    ...range(33, 64).map(sourceUrl),
    { type: 'step-start' }, read('r2', 40), failedRead, webSearch, readSource,
    { type: 'step-start' }, { type: 'reasoning', text: '…' }, { type: 'text', text: 'Again [3, p.4] and [40, ¶2].', state: 'done' },
] } as UIMessage;
const user = (id: string, text: string): UIMessage => ({ id, role: 'user', parts: [{ type: 'text', text }] });
const conversation = [user('u1', 'Which years?'), first, user('u2', 'And later?'), second, user('u3', 'Anything else?')];

type Out = { output?: Record<string, unknown> };
const passageTool = (type: string) => ['tool-searchPassages', 'tool-readUnits', 'tool-listDocuments'].includes(type);

it('builds a follow-up a units-mode conversation would otherwise overflow', () => {
    expect(second.parts.length).toBeGreaterThan(MAX_PARTS);
    const sent = getChatRequestMessages(conversation);
    for (const message of sent) expect(message.parts.length).toBeLessThanOrEqual(MAX_PARTS);
});

it('carries no passage or unit text, and stays under 20 kB', () => {
    const body = JSON.stringify({ messages: getChatRequestMessages(conversation) });
    expect(JSON.stringify({ messages: conversation }).length).toBeGreaterThan(200_000);
    expect(body).not.toContain('uuu');
    expect(body).not.toContain('"passage"');
    expect(body).not.toContain('"text":"u');
    expect(new TextEncoder().encode(body).length).toBeLessThan(20_000);
});

it('keeps exactly what the API reads from each passage tool output', () => {
    const sent = getChatRequestMessages(conversation);
    const tools = sent.flatMap(m => m.parts).filter(p => passageTool(p.type)) as unknown as (Out & { toolCallId: string })[];
    const byId = new Map(tools.map(t => [t.toolCallId, t.output]));
    expect(byId.get('s5')).toEqual({ documents: range(33, 40).map(ref) });
    expect(byId.get('sx')).toEqual({ error: 'Search limit reached for this answer', documents: [] });
    expect(byId.get('r2')).toEqual({ units: [{ locator: 'p.4' }, { locator: 'p.5' }], documents: [ref(40)] });
    expect(byId.get('rx')).toEqual({ error: 'Unknown document number' });
    expect(byId.get('l1')).toEqual({});
});

it('keeps type, state, toolCallId and input of a passage tool part', () => {
    const original = second.parts.find(p => p.type === 'tool-readUnits') as unknown as Record<string, unknown>;
    const sent = getChatRequestMessages(conversation)[3].parts.find(p => p.type === 'tool-readUnits') as unknown as Record<string, unknown>;
    const withoutOutput = (part: Record<string, unknown>) => Object.fromEntries(Object.entries(part).filter(([key]) => key !== 'output'));
    expect(withoutOutput(sent)).toEqual(withoutOutput(original));
    expect(sent.input).toBe(original.input);
});

it('sends text and legacy tool parts byte for byte, in order, and keeps every answer\'s documents', () => {
    const sent = getChatRequestMessages(conversation);
    expect(sent.map(m => [m.id, m.role])).toEqual(conversation.map(m => [m.id, m.role]));
    for (const [i, message] of sent.entries()) {
        const kept = conversation[i].parts.filter(part => part.type === 'text' || part.type.startsWith('tool-'));
        expect(message.parts.map(p => p.type)).toEqual(kept.map(p => p.type));
        kept.forEach((part, j) => {
            if (!passageTool(part.type)) expect(JSON.stringify(message.parts[j])).toBe(JSON.stringify(part));
        });
    }
    const documents = sent[3].parts.flatMap(part => part.type === 'tool-searchPassages'
        ? (part as unknown as { output: { documents: { n: number }[] } }).output.documents.map(d => d.n) : []);
    expect(documents).toEqual(range(33, 64));
});

it('leaves out only the parts the API never reads: sources, step markers and reasoning', () => {
    const types = new Set(getChatRequestMessages(conversation).flatMap(m => m.parts.map(p => p.type)));
    expect([...types].sort()).toEqual(['text', 'tool-listDocuments', 'tool-readSource', 'tool-readUnits', 'tool-searchPassages', 'tool-webSearch']);
});

it('does not change the messages the page shows', () => {
    const before = JSON.stringify(conversation);
    getChatRequestMessages(conversation);
    expect(JSON.stringify(conversation)).toBe(before);
});

it('passes on a passage tool part that has not completed, or whose output is not an object, as it is', () => {
    const pending = { type: 'tool-searchPassages', toolCallId: 'p', state: 'input-available', input: { query: 'q' } };
    const odd = { type: 'tool-readUnits', toolCallId: 'o', state: 'output-error', input: { n: 1 }, errorText: 'boom' };
    const sent = getChatRequestMessages([{ id: 'a', role: 'assistant', parts: [pending, odd] } as UIMessage]);
    expect(sent[0].parts).toEqual([pending, odd]);
});
