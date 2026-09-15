"use client";

import { useEffect } from "react";
import { outboundClickEvent } from "@/lib/analytics/outboundClickEvent";
import { trackEvent } from "@/lib/analytics/trackEvent";

// One delegated listener for every off-site link on the artist page, so the
// components that render links (Links, Latest, Ask, Sources…) stay untouched.
// The surface is the enclosing `mn-*` section; see docs/analytics.md.
export default function OutboundClickTracker() {
    useEffect(() => {
        function onClick(event: MouseEvent) {
            const target = event.target;
            if (!(target instanceof Element)) return;
            const anchor = target.closest("a[href]");
            if (!(anchor instanceof HTMLAnchorElement)) return;
            const section = anchor.closest('[id^="mn-"]');
            const payload = outboundClickEvent(anchor.getAttribute("href") ?? "", section?.id ?? null, window.location.origin);
            if (payload) trackEvent("outbound_click", payload);
        }
        document.addEventListener("click", onClick, true);
        return () => document.removeEventListener("click", onClick, true);
    }, []);
    return null;
}
