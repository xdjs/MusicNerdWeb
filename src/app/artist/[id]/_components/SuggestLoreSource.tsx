"use client";

import { useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { normalizePublicUrl } from "@/lib/links/normalizePublicUrl";
import { requestLoreSuggestion } from "@/lib/source/requestLoreSuggestion";
import { requestLogin } from "@/app/_components/nav/components/requestLogin";

export default function SuggestLoreSource({ artistId, isClaimed, autoApprove = false }: { artistId: string; isClaimed: boolean; autoApprove?: boolean }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const title = autoApprove ? "Add a Lore source" : "Suggest a Lore source";

  if (!session) {
    return <Button type="button" variant="pink" className="w-full sm:w-auto" disabled={status === "loading"}
      onClick={() => requestLogin("add_link")}>Suggest a Lore source</Button>;
  }

  function handleOpenChange(next: boolean) {
    if (submitting) return;
    setOpen(next);
    if (!next) {
      setUrl("");
      setMessage("");
      setError("");
    }
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
      const response = await requestLoreSuggestion(artistId, normalized);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error ?? "Could not submit the source. Please try again.");
      } else {
        setUrl("");
        const approved = result.sourceStatus === "approved";
        setMessage([
          approved ? "Added to Lore. You can add another source." : isClaimed
            ? "Submitted for artist review. You can suggest another source."
            : "Submitted for review. An admin can approve it until the artist claims this profile.",
          result.warning,
        ].filter(Boolean).join(" "));
        if (approved) router.refresh();
      }
    } catch {
      setError("Could not submit the source. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return <>
    <Button type="button" variant="pink" className="w-full sm:w-auto" onClick={() => setOpen(true)}>
      {title}
    </Button>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="mn-themed-dialog max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-2xl p-5 text-foreground sm:rounded-2xl sm:p-6">
        <DialogHeader className="space-y-2 pr-7 text-left">
          <DialogTitle className="text-xl font-semibold leading-snug tracking-tight">{title}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            {autoApprove
              ? "Share an article, interview, or other source. Your sources are approved automatically and added to Lore."
              : isClaimed
              ? "Share an article, interview, or other source. The artist will review it before it appears in Lore."
              : "Share an article, interview, or other source. This profile is unclaimed, so an admin can review it until the artist claims it."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5" aria-busy={submitting}>
          <div className="space-y-2">
            <label htmlFor={`lore-source-${artistId}`} className="text-sm font-medium text-foreground">Source URL</label>
            <Input id={`lore-source-${artistId}`} type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={url}
              onChange={event => { setUrl(event.target.value); setMessage(""); setError(""); }}
              placeholder="https://example.com/interview" className="min-h-12 rounded-xl border-input bg-black/[0.03] dark:bg-white/5 px-3 py-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:ring-pastypink/50 sm:text-sm" />
          </div>
          {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
          {message && <p role="status" className="text-sm text-green-700 dark:text-green-300">{message}</p>}
          <DialogFooter className="sm:flex-col sm:space-x-0">
            <Button type="submit" variant="pink" className="w-full" disabled={submitting || !url.trim()}>
              {submitting ? (autoApprove ? "Adding…" : "Suggesting…") : (autoApprove ? "Add source" : "Suggest source")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
