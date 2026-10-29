/** Keep the experiment confined to its existing preview deployment. */
export function previewApiUrl(): string | null {
  const url = process.env.MUSICNERD_CANVAS_API_PREVIEW_URL;
  return process.env.VERCEL_ENV === "preview" &&
    process.env.MUSICNERD_CANVAS_PREVIEW_ENABLED === "1" &&
    url &&
    /^https:\/\/api-[a-z0-9-]+-musicnerd\.vercel\.app$/.test(url)
    ? url
    : null;
}
