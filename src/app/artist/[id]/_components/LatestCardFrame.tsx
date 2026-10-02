import type { MouseEventHandler, ReactNode } from 'react';

export default function LatestCardFrame({ children, onOpen, label, instagram }: {
    children: ReactNode; onOpen: MouseEventHandler<HTMLButtonElement>; label: string; instagram: boolean;
}) {
    const style = 'group relative flex h-[300px] w-full flex-col justify-end overflow-hidden rounded-2xl border border-pastypink/25 bg-[#000] p-5 text-left text-white shadow-[0_8px_28px_rgba(236,72,153,0.10)] transition-transform motion-safe:hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-highlightpink focus-within:outline focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-highlightpink';
    if (!instagram) return <button type="button" onClick={onOpen} aria-label={label} className={style}>{children}</button>;
    // Caption anchors are siblings of the opener, never interactive children of a button.
    return <div className={style}>
        <button type="button" onClick={onOpen} aria-label={label}
            className="absolute inset-0 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-highlightpink" />
        {children}
    </div>;
}
