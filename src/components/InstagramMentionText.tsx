import { Fragment } from 'react';
import { getInstagramMentions } from '@/lib/instagram/getInstagramMentions';

/** Only use for stored Instagram captions; arbitrary prose needs source verification first. */
export default function InstagramMentionText({ text, preview = false }: { text: string; preview?: boolean }) {
    let cursor = 0;
    const parts = getInstagramMentions(text).map(mention => {
        const prefix = text.slice(cursor, mention.start);
        cursor = mention.end;
        return <Fragment key={mention.start}>{prefix}<a href={mention.href} target="_blank" rel="noopener noreferrer"
            tabIndex={preview ? -1 : undefined}
            className="pointer-events-auto relative z-10 underline decoration-dotted underline-offset-2 hover:decoration-solid focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-highlightpink"
            title={`Open @${mention.handle} on Instagram`}>{text.slice(mention.start, mention.end)}</a></Fragment>;
    });
    return <>{parts}{text.slice(cursor)}</>;
}
