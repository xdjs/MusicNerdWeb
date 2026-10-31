/** Local browser QA only: this fetch never calls a network or model provider. */
export function createRecorderFixtureFetch(): typeof fetch {
    let request = 0;
    return async (_input, init) => {
        const number = ++request;
        const body = JSON.parse(String(init?.body));
        const question = body.messages.at(-1)?.parts?.find((p: {type: string}) => p.type === 'text')?.text ?? '';
        const invalid = question.includes('missing terminal');
        const base = {version: 2, requestId: `fixture-budget-${number}`, estimateOnly: true, limitUsd: .15};
        const held = ((100 + 2048) * 4400 + 1024 * 11000) / 1e9;
        const used = (10 * 4400 + 2 * 11000) / 1e9;
        const citation = {sourceId: '1', title: 'Synthetic recorder fixture — not artist evidence', url: 'http://localhost:4314/dev/chat-evidence/recorder-replay#fixture-source'};
        const text = number === 1 ? 'Fixture singer: Álex [1] & <b>literal text</b>.\nThis is synthetic UI data.' : 'Fixture birthplace: Example Island.\nThis is a synthetic follow-up, not a real artist fact.';
        const events = [
            {type: 'start', messageId: `fixture-message-${number}`},
            {type: 'data-preview-budget', transient: true, data: {...base, phase: 'reserved', step: 1, preparedBytes: 100, inputTokenEstimate: 2148, outputTokens: 1024, reservedUsd: held, observedUpperEstimateUsd: 0}},
            {type: 'source-url', ...citation},
            {type: 'data-evidence-passage', id: `fixture-passage-${number}`, data: {text, citation, publishedAt: null, activityDate: null, retrievedAt: null}},
            {type: 'data-preview-budget', transient: true, data: {...base, phase: 'reconciled', step: 1, inputTokens: 10, outputTokens: 2, finishReason: 'stop', accounting: 'reservation_retained', settlementUsd: null, reservedUsd: held, observedUpperEstimateUsd: used}},
            {type: 'data-preview-budget', transient: true, data: {...base, phase: 'complete', attempts: 1, reconciled: 1, reservedUsd: held, observedUpperEstimateUsd: used}},
            {type: 'finish'},
        ].map(event => `data: ${JSON.stringify(event)}\n\n`);
        if (!invalid) events.push('data: [DONE]\n\n');
        let index = 0;
        return new Response(new ReadableStream<Uint8Array>({
            async pull(controller) {
                if (init?.signal?.aborted) { controller.error(new Error('Fixture aborted')); return; }
                if (index === events.length) { controller.close(); return; }
                await new Promise(resolve => setTimeout(resolve, 250));
                if (init?.signal?.aborted) { controller.error(new Error('Fixture aborted')); return; }
                controller.enqueue(new TextEncoder().encode(events[index++]));
            },
        }, {highWaterMark: 0}), {headers: {'content-type': 'text/event-stream', 'x-vercel-ai-ui-message-stream': 'v1'}});
    };
}
