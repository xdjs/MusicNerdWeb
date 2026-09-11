"use client"

import { useState, useEffect, useContext } from "react";
import { EditModeContext } from "@/app/_components/EditModeContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useArtistBio } from "@/hooks/useArtistBio";
import { renderBioMarkdown } from "@/lib/renderBioMarkdown";
import BioVersionHistory from "./BioVersionHistory";

interface BlurbSectionProps {
  artistName: string;
  artistId: string;
  initialBio?: string | null;
  hero?: boolean;
  portrait?: boolean;
}

export default function BlurbSection({ artistName, artistId, initialBio, hero = false, portrait = false }: BlurbSectionProps) {
  const { isEditing, canEdit, refreshProfile } = useContext(EditModeContext);
  const { toast } = useToast();
  const { bio: aiBlurb, loading: loadingAi, refetch } = useArtistBio(artistId, initialBio);

  const [expanded, setExpanded] = useState(false);
  const [editText, setEditText] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [originalBio, setOriginalBio] = useState<string>("");
  const [historyRevision, setHistoryRevision] = useState(0);

  // Update edit text when bio changes
  useEffect(() => {
    if (aiBlurb) {
      setEditText(aiBlurb);
      setOriginalBio(aiBlurb);
    }
  }, [aiBlurb]);

  // Reset the edit text when exiting edit mode without saving
  useEffect(() => {
    if (!isEditing) {
      setEditText(aiBlurb ?? "");
      setOriginalBio(aiBlurb ?? "");
    }
  }, [isEditing, aiBlurb]);

  async function handleSave() {
    // Prevent saving empty bios – restore original text instead
    if (editText.trim() === "") {
      setEditText(aiBlurb ?? "");
      return;
    }
    if (isSaving) return;
    setIsSaving(true);
    try {
      const resp = await fetch(`/api/artistBio/${artistId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bio: editText }),
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok) {
        setOriginalBio(editText);
        // Refetch to update the cache
        refetch();
        setHistoryRevision(v => v + 1);
        refreshProfile?.();
        toast({ title: "Bio saved", description: "Your edited bio is saved in Lore." });
      } else {
        toast({ title: "Error saving bio", description: data?.message ?? "Please try again." });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error saving bio", description: "Please try again." });
    } finally {
      setIsSaving(false);
    }
  }

  function handleDiscard() {
    setEditText(originalBio);
  }

  async function handleRegenerate() {
    if (isRegenerating) return;
    setIsRegenerating(true);
    try {
      // One explicit generation request. Retrying via GET could start a second
      // model call after a timeout or hide an authorization/locked-bio error.
      const resp = await fetch(`/api/artistBio/${artistId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate: true }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setEditText(data.bio);
        refetch(); // Update the hook's displayed bio
        setHistoryRevision(v => v + 1);
        refreshProfile?.();
        toast({ title: data.message ?? "Bio regenerated" });
      } else {
        const data = await resp.json().catch(() => ({}));
        toast({ title: "Error regenerating bio", description: data?.error ?? data?.message ?? "Please try again." });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error regenerating bio", description: "Please try again." });
    } finally {
      setIsRegenerating(false);
    }
  }

  if (loadingAi) {
    return (
      <div className="glass-subtle p-3 min-h-[80px]">
        <p className="text-gray-500 dark:text-gray-400 italic">Loading summary...</p>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className={hero ? "bio-editor space-y-4 rounded-2xl border border-white/15 bg-neutral-950/70 p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl sm:p-5" : "space-y-4"}>
        <textarea
          aria-label="Artist biography"
          disabled={isPinned || isSaving || isRegenerating}
          className={hero ? "h-48 w-full resize-y rounded-xl border border-white/10 bg-black/20 p-3 text-sm leading-7 text-white/90 outline-none [color-scheme:dark] focus:border-pastypink/60 focus:ring-1 focus:ring-pastypink/40 disabled:opacity-70" : "w-full glass-subtle p-3 text-black dark:text-white h-40"}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          placeholder="Enter artist bio..."
        />
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={isPinned || isRegenerating || isSaving}
                className={hero ? "min-h-11 rounded-lg border-white/15 bg-transparent text-white/75 hover:bg-white/10 hover:text-white" : "text-gray-700 dark:text-gray-200"}
              >
                {isRegenerating ? (
                  <>
                    <img src="/spinner.svg" className="h-3 w-3 mr-1" alt="regenerating" />
                    Regenerating...
                  </>
                ) : (
                  "Regenerate"
                )}
              </Button>
            )}

          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className={hero ? "min-h-11 rounded-lg text-white/65 hover:bg-white/10 hover:text-white" : ""} onClick={handleDiscard} disabled={isSaving || isRegenerating}>
              Discard
            </Button>
            <Button variant="pink" onClick={handleSave} disabled={isPinned || isRegenerating || isSaving || (editText?.trim() ?? "") === (originalBio?.trim() ?? "")}>
              {isSaving ? <img src="/spinner.svg" className="h-4 w-4" alt="saving" /> : "Save"}
            </Button>
          </div>
        </div>
        <BioVersionHistory artistId={artistId} onChanged={refetch} revision={historyRevision} showHistory={!hero} onPinnedChange={setIsPinned} />
      </div>
    );
  }

  if (hero) {
    if (!aiBlurb) return null;
    const text = aiBlurb.replace(/\[\d+(?:\s*,\s*\d+)*\]/g, "");
    const canExpand = text.length > 220;
    const excerpt = text.slice(0, 220).replace(/\s+\S*$/, "") + "…";
    return <div>
      <p id={`artist-bio-${artistId}`} className={`whitespace-pre-line text-sm leading-relaxed sm:text-base ${portrait ? "text-white" : "text-gray-700 dark:text-gray-200"}`}
        dangerouslySetInnerHTML={{ __html: renderBioMarkdown(canExpand && !expanded ? excerpt : text) }} />
      {canExpand && <button type="button" aria-expanded={expanded} aria-controls={`artist-bio-${artistId}`}
        onClick={() => setExpanded(value => !value)}
        className={`mt-1 min-h-11 text-sm font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pastypink ${portrait ? "text-white hover:text-pastypink" : "text-gray-950 dark:text-white"}`}>
        {expanded ? "Show less" : "Read more"}
      </button>}
    </div>;
  }

  // Non-editing view — show the full bio (no truncation)
  return (
    <div className="glass-subtle p-3">
      {aiBlurb ? (
        <p
          className="text-black dark:text-white text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: renderBioMarkdown(aiBlurb) }}
        />
      ) : (
        <p className="text-gray-500 dark:text-gray-400 italic">No summary is available</p>
      )}
    </div>
  );
}
