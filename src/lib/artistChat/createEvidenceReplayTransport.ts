import type { ChatTransport, UIMessage, UIMessageChunk } from 'ai';

/** Offline UI replay only: no fetch, API, credentials, model or search calls. */
export function createEvidenceReplayTransport(): ChatTransport<UIMessage> {
    return {
        reconnectToStream: async () => null,
        sendMessages: async ({ messages, abortSignal }) => {
            const question = messages.filter(message => message.role === 'user').at(-1)?.parts.flatMap(part => part.type === 'text' ? [part.text] : []).join(' ').toLowerCase() ?? '';
            const literal = /literal|bracket|syntax/.test(question);
            const singer = /singer|who|where|from/.test(question);
            const album = /album|first|col[oó]n/.test(question);
            const text = literal ? '[Artist Doc] [1] & <b>literal, not HTML</b>\n\nSecond paragraph: 2 < 3 & 4 > 1.'
                : singer ? 'The ten-piece powerhouse performs original music and features lead singer, Puerto Rican native, Rei Alvarez who is backed by full Latin rhythm section (congas, timbales, bongo) piano, electric bass, two trumpets, trombone and tenor sax.'
                : '12 July 2025\n\nIt was the first collaboration between Willie Colón and a then-rising Rubén Blades.';
            const url = literal ? new URL('/dev/chat-evidence/replay#syntax', typeof window === 'undefined' ? 'http://127.0.0.1:4314' : window.location.origin).href
                : singer ? 'https://vca.virginia.gov/directory/bio-ritmo'
                : 'https://glidemagazine.com/315029/willie-colon-and-ruben-blades-1977-socially-conscious-salsa-lp-metiendo-mano-gets-vinyl-reissue-album-review';
            const citation = { sourceId: '1', url, title: literal ? 'UI syntax fixture — not artist evidence' : 'Retained public source — offline replay' };
            let cleanup = () => {};
            return new ReadableStream<UIMessageChunk>({
                start(controller) {
                    let closed = false;
                    const timers: ReturnType<typeof setTimeout>[] = [];
                    cleanup = () => {
                        for (const timer of timers) clearTimeout(timer);
                        abortSignal?.removeEventListener('abort', abort);
                        closed = true;
                    };
                    const close = () => { if (!closed) { cleanup(); controller.close(); } };
                    const abort = () => close();
                    abortSignal?.addEventListener('abort', abort, { once: true });
                    if (abortSignal?.aborted) { close(); return; }
                    controller.enqueue({ type: 'start', messageId: crypto.randomUUID() });
                    controller.enqueue({ type: 'data-evidence-mode', data: { version: 1 } });
                    timers.push(setTimeout(() => {
                        if (closed) return;
                        if (!literal && !singer && !album) {
                            controller.enqueue({ type: 'data-evidence-status', data: { code: 'validation_failed' } });
                        } else {
                            controller.enqueue({ type: 'source-url', ...citation });
                            controller.enqueue({ type: 'data-evidence-passage', id: crypto.randomUUID(), data: { text, citation, publishedAt: null, activityDate: null, retrievedAt: null } });
                        }
                    }, 400));
                    timers.push(setTimeout(() => {
                        if (closed) return;
                        controller.enqueue({ type: 'finish', finishReason: 'stop' });
                        close();
                    }, 2400));
                },
                cancel() { cleanup(); },
            });
        },
    };
}
