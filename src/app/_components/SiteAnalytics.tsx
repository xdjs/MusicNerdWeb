"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { scrubAnalyticsUrl } from "@/lib/analytics/scrubAnalyticsUrl";

// Client component only because `beforeSend` is a function prop. Every event's
// URL goes through the allowlist scrub (see docs/analytics.md); `null` drops it.
function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  const url = scrubAnalyticsUrl(event.url);
  return url === null ? null : { ...event, url };
}

export default function SiteAnalytics() {
  return <Analytics beforeSend={beforeSend} />;
}
