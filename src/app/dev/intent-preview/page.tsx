import { notFound } from "next/navigation";
import ArtistEntry from "./ArtistEntry";
export default function IntentPreviewPage() {
  if (
    process.env.NODE_ENV !== "development" &&
    process.env.VERCEL_ENV !== "preview"
  )
    notFound();
  const configured = process.env.MUSICNERD_CANVAS_API_PREVIEW_URL;
  const liveApiUrl =
    process.env.VERCEL_ENV === "preview" &&
    process.env.MUSICNERD_CANVAS_PREVIEW_ENABLED === "1" &&
    configured &&
    /^https:\/\/api-[a-z0-9-]+-musicnerd\.vercel\.app$/.test(configured)
      ? configured
      : undefined;
  return <ArtistEntry liveApiUrl={liveApiUrl} />;
}
