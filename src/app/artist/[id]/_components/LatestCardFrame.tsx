import type { MouseEventHandler, ReactNode } from 'react';

export default function LatestCardFrame({ children, onOpen, label, instagram }: {
    children: ReactNode; onOpen: MouseEventHandler<HTMLButtonElement>; label: string; instagram: boolean;
}) {
    const style = 'artist-carousel-card group relative flex h-[300px] w-full flex-col justify-end overflow-hidden rounded-2xl border border-pastypink/25 bg-[#000] p-5 text-left text-white focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-highlightpink focus-within:outline focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-highlightpink';
    if (!instagram) return <button type="button" onClick={onOpen} aria-label={label} className={style}>{children}</button>;
    // Caption anchors are siblings of the opener, never interactive children of a button.
    return <div className={style}>
        <button type="button" onClick={onOpen} aria-label={label}
            className="absolute inset-0 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-highlightpink" />
        {children}
    </div>;
}
