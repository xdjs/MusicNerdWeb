'use client';
import { useMemo, useState } from 'react';
import { createEvidenceReplayTransport } from '@/lib/artistChat/createEvidenceReplayTransport';
import AskAboutArtist from '../../artist/[id]/_components/AskAboutArtist';

/** Explicit integration surface; no request occurs until a tester submits a chat question. */
export default function EvidenceChatPreview({ replay = false }: { replay?: boolean }) {
    const replayTransport = useMemo(() => replay ? createEvidenceReplayTransport() : undefined, [replay]);
    const [id, setId] = useState(replay ? '11111111-1111-4111-8111-111111111111' : '');
    const [mode, setMode] = useState<'ordinary' | 'source_passages'>(replay ? 'source_passages' : 'ordinary');
    const [selection, setSelection] = useState<{ id: string; mode: typeof mode; conversation: number }>();
    return <main className="mx-auto max-w-2xl space-y-4 p-6 text-foreground">
        <h1 className="text-xl">Chat evidence integration test</h1>
        <p hidden={replay}>Use an existing artist ID from the paired API environment. Saved-source mode quotes approved text only; it does not read PDFs or search the live web. Starting a conversation does not submit a model request.</p>
        {replay ? <aside className="space-y-2 rounded border border-amber-400/50 bg-amber-400/10 p-3" aria-label="Offline replay notice">
            <strong>Offline replay — no model calls or live sources</strong>
            <p>Scripted UI verification only. Ask “What was their first album together?”, “Who is the singer?”, “Where is he from?”, or “Show literal brackets”. Unrecognized questions show the failure state. Each response pauses before completion so Stop can be tested.</p>
            <pre id="syntax" className="whitespace-pre-wrap text-xs">{'UI syntax fixture (not artist evidence):\n[Artist Doc] [1] & <b>literal, not HTML</b>\n\nSecond paragraph: 2 < 3 & 4 > 1.'}</pre>
        </aside> : null}
        <form className="space-y-3" onSubmit={event => { event.preventDefault(); setSelection(previous => ({ id: id.trim(), mode, conversation: (previous?.conversation ?? 0) + 1 })); }}>
            <label className="block">Artist ID <input readOnly={replay} required value={id} onChange={event => setId(event.target.value)} pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}" className="block min-h-11 w-full rounded border border-input bg-background p-2 text-foreground" /></label>
            <label className="block">Response mode <select disabled={replay} value={mode} onChange={event => setMode(event.target.value as typeof mode)} className="ml-2 min-h-11 rounded border border-input bg-background p-2 text-foreground"><option value="ordinary">Ordinary chat (unchanged)</option><option value="source_passages">Saved-source passages (test)</option></select></label>
            <button type="submit" className="min-h-11 rounded border border-input px-3 py-2 text-foreground">Start a new conversation</button>
        </form>
        {selection ? <AskAboutArtist key={`${selection.id}:${selection.mode}:${selection.conversation}`} artistId={selection.id} artistName="this artist" replayTransport={replayTransport} responseMode={selection.mode === 'source_passages' ? selection.mode : undefined} /> : null}
    </main>;
}
