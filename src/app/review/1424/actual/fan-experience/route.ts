import report from "./report.json";

export const dynamic = "force-dynamic";

/** Saved public-source fan evaluation; no live generation or app integrations. */
export function GET() {
  if (process.env.NODE_ENV !== "development" && process.env.VERCEL_ENV !== "preview") {
    return new Response("Not found", { status: 404 });
  }

  return new Response(report.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      "Referrer-Policy": "no-referrer",
    },
  });
}
