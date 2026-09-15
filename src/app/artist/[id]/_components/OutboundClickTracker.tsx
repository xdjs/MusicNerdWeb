"use client";

import { useEffect } from "react";
import { outboundClickEvent } from "@/lib/analytics/outboundClickEvent";
import { outboundSurface } from "@/lib/analytics/outboundSurface";
import { trackEvent } from "@/lib/analytics/trackEvent";

// One delegated listener for every off-site link on the artist page, so the
// components that render links (Links, Latest, Ask, Sources…) stay untouched.
// The surface is a `data-analytics-surface` (dialogs, which are portalled) or the
// enclosing `mn-*` section; see docs/analytics.md.
export default function OutboundClickTracker() {
    useEffect(() => {
        function onClick(event: MouseEvent) {
            const target = event.target;
            if (!(target instanceof Element)) return;
            const anchor = target.closest("a[href]");
            if (!(anchor instanceof HTMLAnchorElement)) return;
            const payload = outboundClickEvent(anchor.getAttribute("href") ?? "", outboundSurface(anchor), window.location.origin);
            if (payload) trackEvent("outbound_click", payload);
        }
        document.addEventListener("click", onClick, true);
        return () => document.removeEventListener("click", onClick, true);
    }, []);
    return null;
}
