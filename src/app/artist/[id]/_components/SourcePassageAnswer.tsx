import { useEffect } from 'react';
import { readEvidenceAnswer } from '@/lib/artistChat/readEvidenceAnswer';

/** Render server-selected source words as React text, never Markdown or generated answer prose. */
export default function SourcePassageAnswer({ parts, busy = false, stopped = false, interrupted = false, onRetry, messageId, onEvidenceRender }: {
    messageId?: string; onEvidenceRender?: (messageId: string, passageId: string) => void;
    parts: readonly unknown[]; busy?: boolean; stopped?: boolean; interrupted?: boolean; onRetry?: () => void;
}) {
    const evidence = readEvidenceAnswer(parts);
    useEffect(() => {
        if (messageId && onEvidenceRender) for (const passage of evidence.passages) onEvidenceRender(messageId, passage.id);
    }, [messageId, onEvidenceRender, evidence.passages]);
    const failed = evidence.invalid || !!evidence.status;
    return <div className="space-y-3 px-1" data-testid="source-passage-answer">
        {evidence.passages.map(passage => <figure key={passage.id} className="space-y-2">
            <figcaption className="flex items-center gap-1 text-xs text-muted-foreground">Source passage{' '}
                <a href={passage.citation.url} target="_blank" rel="noopener noreferrer" title={passage.citation.title}
                    aria-label={`Open source ${passage.citation.sourceId}`}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border text-primary underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">[{passage.citation.sourceId}]</a>
            </figcaption>
            <blockquote data-testid="source-passage-text" className="border-l-2 border-border pl-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">{passage.text}</blockquote>
        </figure>)}
        {failed ? <p role="status" className="text-sm text-muted-foreground">{evidence.passages.length ? "I couldn't validate an additional source passage." : "I couldn't validate a source passage for this response."}</p>
            : stopped ? <p role="status" className="text-sm text-muted-foreground">Stopped. Any passages above arrived before you stopped.</p>
            : interrupted ? <p role="status" className="text-sm text-muted-foreground">The response was interrupted. Any passages above were received before the interruption.</p>
            : busy ? <p role="status" className="text-sm text-muted-foreground">Checking saved source passages…</p>
            : !evidence.passages.length ? <p role="status" className="text-sm text-muted-foreground">I couldn&apos;t validate a source passage for this response.</p> : null}
        {(stopped || interrupted) && !busy && onRetry ? <button type="button" onClick={onRetry} className="min-h-11 text-sm text-primary underline underline-offset-4">Try again</button> : null}
        {evidence.passages.length ? <p className="text-[10px] text-muted-foreground">Quoted from saved sources. Selection may be incomplete; sources can disagree.</p> : null}
    </div>;
}
