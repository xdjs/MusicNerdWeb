import { notFound, redirect } from "next/navigation";
/** Preserve old preview bookmarks while returning entry to Music Nerd's real home. */
export default function IntentPreviewPage() {
  if (process.env.NODE_ENV !== "development" && process.env.VERCEL_ENV !== "preview") notFound();
  redirect("/");
}
