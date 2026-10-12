/**
 * The "Tap to follow along" hint over the progress pill until the artist first
 * taps either (docs/research-view.md, "Progress pill"). Tapping it does what
 * tapping the pill does. It is out of the tab order and hidden from screen
 * readers: the pill is the one control.
 */
export default function FollowHint({ onFollow }: { onFollow: () => void }) {
    return (
        <button type="button" tabIndex={-1} aria-hidden="true" onClick={onFollow} className="flex min-h-9 items-center gap-1.5 rounded-full bg-highlightpink px-2.5 py-1.5 text-[13px] font-semibold text-black hover:opacity-90">
            Tap to follow along
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="motion-safe:animate-bounce"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
        </button>
    );
}
