"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import styles from "./ProfileSectionNav.module.css";

const sections = [
    { id: "mn-latest", label: "Latest" },
    { id: "mn-links", label: "Links" },
    { id: "mn-lore", label: "Lore" },
];
const clamp = (value: number) => Math.max(0, Math.min(sections.length - 1, value));

export default function ProfileSectionNav() {
    const [active, setActive] = useState(0);
    const [dragPosition, setDragPosition] = useState<number | null>(null);
    const [instant, setInstant] = useState(false);
    const links = useRef<Array<HTMLAnchorElement | null>>([]);
    const gesture = useRef<{ id: number; x: number; y: number; start: number; width: number; position: number; dragging: boolean } | null>(null);
    const suppressClick = useRef(false);

    useEffect(() => {
        const syncHash = () => {
            const index = sections.findIndex(section => `#${section.id}` === window.location.hash);
            if (index >= 0) setActive(index);
        };
        syncHash();
        window.addEventListener("hashchange", syncHash);
        return () => window.removeEventListener("hashchange", syncHash);
    }, []);

    function select(index: number, keyboard = false) {
        const section = sections[index];
        if (!section) return;
        const target = document.getElementById(section.id);
        if (!target) return;
        setInstant(keyboard);
        setActive(index);
        // Preserve the real section URL without triggering a second native jump.
        window.history.replaceState(window.history.state, "", `#${section.id}`);
        target.scrollIntoView({ behavior: keyboard || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    }

    function startDrag(event: PointerEvent<HTMLElement>) {
        if (!event.isPrimary || event.button !== 0 || gesture.current) return;
        const target = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[data-section-index]");
        if (!target) return;
        const index = Number(target.dataset.sectionIndex);
        const width = target.getBoundingClientRect().width;
        if (!width) return;
        suppressClick.current = false;
        setInstant(false);
        gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, start: index, width, position: index, dragging: false };
    }

    function moveDrag(event: PointerEvent<HTMLElement>) {
        const drag = gesture.current;
        if (!drag || drag.id !== event.pointerId) return;
        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;
        if (!drag.dragging) {
            // Let a vertical swipe scroll the profile normally.
            if (Math.abs(dy) > Math.max(6, Math.abs(dx))) {
                gesture.current = null;
                return;
            }
            if (Math.abs(dx) < 6) return;
            drag.dragging = true;
            event.currentTarget.setPointerCapture(event.pointerId);
        }
        drag.position = clamp(drag.start + dx / drag.width);
        setDragPosition(drag.position);
    }

    function endDrag(event: PointerEvent<HTMLElement>, cancelled = false) {
        const drag = gesture.current;
        if (!drag || drag.id !== event.pointerId) return;
        gesture.current = null;
        setDragPosition(null);
        if (drag.dragging) {
            suppressClick.current = true;
            if (!cancelled) select(Math.round(drag.position));
        }
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    }

    return <nav
        aria-label="Explore artist profile"
        className={styles.rail}
        data-dragging={dragPosition !== null}
        data-instant={instant}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={event => endDrag(event)}
        onPointerCancel={event => endDrag(event, true)}
        onLostPointerCapture={event => {
            // Touch starts with implicit capture on the link. Transferring it
            // to the rail must not cancel our drag when the link loses capture.
            if (event.target === event.currentTarget) endDrag(event, true);
        }}
        onDragStart={event => event.preventDefault()}
        onClickCapture={event => {
            if (suppressClick.current && event.detail !== 0) {
                event.preventDefault();
                event.stopPropagation();
                suppressClick.current = false;
            }
        }}
    >
        <span aria-hidden="true" className={styles.lens} style={{ transform: `translateX(${(dragPosition ?? active) * 100}%)` }} />
        {sections.map((section, index) => <a
            key={section.id}
            ref={element => { links.current[index] = element; }}
            href={`#${section.id}`}
            data-section-index={index}
            aria-current={active === index ? "location" : undefined}
            className={styles.link}
            onClick={event => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                event.preventDefault();
                select(index, event.detail === 0);
            }}
            onKeyDown={event => {
                const next = event.key === "ArrowRight" ? (index + 1) % sections.length
                    : event.key === "ArrowLeft" ? (index + sections.length - 1) % sections.length
                    : event.key === "Home" ? 0 : event.key === "End" ? sections.length - 1 : null;
                if (next === null) return;
                event.preventDefault();
                links.current[next]?.focus();
                select(next, true);
            }}
        >{section.label}</a>)}
    </nav>;
}
