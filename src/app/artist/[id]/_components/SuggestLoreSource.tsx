"use client";

import { useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizePublicUrl } from "@/lib/links/normalizePublicUrl";
import { requestLogin } from "@/app/_components/nav/components/requestLogin";

export default function SuggestLoreSource({ artistId, isClaimed }: { artistId: string; isClaimed: boolean }) {
  const { data: session, status } = useSession();
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!session) {
    return <Button type="button" variant="outline" className="min-h-11 text-black dark:text-white" disabled={status === "loading"}
      onClick={() => requestLogin("add_link")}>Suggest a Lore source</Button>;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setMessage("");
    setError("");
    const normalized = normalizePublicUrl(url);
    if (!normalized) {
      setError("Enter a public website URL.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/artist/${artistId}/lore-suggestions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error ?? "Could not submit the source. Please try again.");
      } else {
        setUrl("");
        setMessage(isClaimed
          ? "Submitted for artist review. You can suggest another source."
          : "Submitted for review. An admin can approve it until the artist claims this profile.");
      }
    } catch {
      setError("Could not submit the source. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return <form onSubmit={submit} className="space-y-2">
    <label htmlFor={`lore-source-${artistId}`} className="text-sm font-medium text-black dark:text-white">Suggest a Lore source</label>
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input id={`lore-source-${artistId}`} type="text" inputMode="url" value={url}
        onChange={event => { setUrl(event.target.value); setMessage(""); setError(""); }}
        placeholder="Article, interview, or other source URL" className="min-h-11 flex-1 text-black dark:text-white" />
      <Button type="submit" variant="outline" className="min-h-11 text-black dark:text-white" disabled={submitting || !url.trim()}>
        {submitting ? "Submitting…" : "Suggest source"}
      </Button>
    </div>
    <p className="text-xs text-muted-foreground">{isClaimed
      ? "The artist will review it before it appears in Lore."
      : "This profile is unclaimed. An admin can review your source until the artist claims it."}</p>
    {message && <p role="status" className="text-sm text-green-700 dark:text-green-300">{message}</p>}
    {error && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{error}</p>}
  </form>;
}
