import { fireEvent, render, screen } from '@testing-library/react';
import ProfileSectionNav from '@/app/artist/[id]/_components/ProfileSectionNav';

const scroll = jest.fn();
const pointer = (clientX: number, clientY = 10, pointerId = 1) => ({ clientX, clientY, pointerId, isPrimary: true, button: 0 });

beforeAll(() => {
    // jsdom does not yet implement PointerEvent or pointer capture.
    class TestPointerEvent extends MouseEvent {
        pointerId: number;
        isPrimary: boolean;
        constructor(type: string, init: PointerEventInit) {
            super(type, init);
            this.pointerId = init.pointerId ?? 1;
            this.isPrimary = init.isPrimary ?? true;
        }
    }
    Object.defineProperty(window, 'PointerEvent', { configurable: true, value: TestPointerEvent });
    HTMLElement.prototype.setPointerCapture = jest.fn();
    HTMLElement.prototype.hasPointerCapture = jest.fn(() => false);
    HTMLElement.prototype.releasePointerCapture = jest.fn();
    HTMLElement.prototype.scrollIntoView = scroll;
});

beforeEach(() => {
    scroll.mockClear();
    window.history.replaceState(null, '', '/');
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
});

function setup() {
    const result = render(<>
        <ProfileSectionNav />
        <section id="mn-latest">Updates</section>
        <section id="mn-links">Platforms</section>
        <section id="mn-lore">Sources</section>
    </>);
    for (const link of screen.getAllByRole('link')) {
        jest.spyOn(link, 'getBoundingClientRect').mockReturnValue({ width: 100 } as DOMRect);
    }
    return { ...result, nav: screen.getByRole('navigation'), latest: screen.getByRole('link', { name: 'Latest' }), lore: screen.getByRole('link', { name: 'Lore' }) };
}

it('clicks navigate directly with one active section and a real fragment URL', () => {
    setup();
    const links = screen.getByRole('link', { name: 'Links' });
    fireEvent.click(links, { detail: 1 });
    expect(links).toHaveAttribute('aria-current', 'location');
    expect(screen.getByRole('link', { name: 'Latest' })).not.toHaveAttribute('aria-current');
    expect(window.location.hash).toBe('#mn-links');
    expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
});

it('tracks horizontal dragging but navigates only on release; ignores the resulting click', () => {
    const { nav, latest } = setup();
    fireEvent.pointerDown(latest, pointer(50));
    fireEvent.pointerMove(nav, pointer(230));
    fireEvent.lostPointerCapture(latest, pointer(230));
    expect(nav).toHaveAttribute('data-dragging', 'true');
    expect(scroll).not.toHaveBeenCalled();
    fireEvent.pointerUp(nav, pointer(230));
    expect(window.location.hash).toBe('#mn-lore');
    fireEvent.click(latest, { detail: 1 });
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe('#mn-lore');
});

it('allows vertical scrolling and cancels interrupted drags without navigation', () => {
    const { nav, latest } = setup();
    fireEvent.pointerDown(latest, pointer(50));
    fireEvent.pointerMove(nav, pointer(52, 70));
    fireEvent.pointerUp(nav, pointer(52, 70));
    expect(nav).toHaveAttribute('data-dragging', 'false');
    fireEvent.pointerDown(latest, pointer(50));
    fireEvent.pointerMove(nav, pointer(200));
    fireEvent.pointerCancel(nav, pointer(200));
    expect(nav).toHaveAttribute('data-dragging', 'false');
    expect(scroll).not.toHaveBeenCalled();
});

it('ignores other fingers and clamps a drag beyond the control', () => {
    const { nav, lore } = setup();
    fireEvent.pointerDown(lore, pointer(250));
    fireEvent.pointerMove(nav, pointer(20, 10, 2));
    expect(nav).toHaveAttribute('data-dragging', 'false');
    fireEvent.pointerMove(nav, pointer(-400));
    fireEvent.pointerUp(nav, pointer(-400));
    expect(window.location.hash).toBe('#mn-latest');
});

it('supports keyboard navigation and reduced motion without animated scrolling', () => {
    const { latest, lore, nav } = setup();
    fireEvent.keyDown(latest, { key: 'End' });
    expect(lore).toHaveFocus();
    expect(lore).toHaveAttribute('aria-current', 'location');
    expect(nav).toHaveAttribute('data-instant', 'true');
    expect(scroll).toHaveBeenLastCalledWith({ behavior: 'instant', block: 'start' });
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    fireEvent.click(latest, { detail: 1 });
    expect(scroll).toHaveBeenLastCalledWith({ behavior: 'instant', block: 'start' });
});

it('restores a shared section URL and responds to fragment navigation', () => {
    window.history.replaceState(null, '', '#mn-lore');
    setup();
    expect(screen.getByRole('link', { name: 'Lore' })).toHaveAttribute('aria-current', 'location');
    window.history.replaceState(null, '', '#mn-links');
    fireEvent(window, new HashChangeEvent('hashchange'));
    expect(screen.getByRole('link', { name: 'Links' })).toHaveAttribute('aria-current', 'location');
    expect(scroll).not.toHaveBeenCalled();
});
