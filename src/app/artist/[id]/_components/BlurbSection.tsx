"use client"

import { useState, useEffect, useContext } from "react";
import { EditModeContext } from "@/app/_components/EditModeContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface BlurbSectionProps {
  artistName: string;
  artistId: string;
}

export default function BlurbSection({ artistName, artistId }: BlurbSectionProps) {
  const { isEditing, canEdit } = useContext(EditModeContext);
  const { toast } = useToast();

  const [openModal, setOpenModal] = useState<boolean>(false);
  const [aiBlurb, setAiBlurb] = useState<string | undefined>();
  const [loadingAi, setLoadingAi] = useState(false);

  const [editText, setEditText] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Fetch bio once on mount (or when artistId changes)
  useEffect(() => {
    if (!aiBlurb && !loadingAi) {
      setLoadingAi(true);
      fetch(`/api/artistBio/${artistId}`)
        .then(async (res) => {
          if (!res.ok) throw new Error("Failed to load summary");
          const json = await res.json();
          setAiBlurb(json.bio as string);
          setEditText(json.bio as string);
        })
        .catch(() => setAiBlurb("Failed to load summary."))
        .finally(() => setLoadingAi(false));
    }
  }, [aiBlurb, artistId, loadingAi]);

  // Reset the edit text when exiting edit mode without saving
  useEffect(() => {
    if (!isEditing) {
      setEditText(aiBlurb ?? "");
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
        setAiBlurb(editText);
        toast({ title: "Bio updated" });
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
    setEditText(aiBlurb ?? "");
  }

  async function handleRegenerate() {
    if (isRegenerating) return;
    setIsRegenerating(true);
    try {
      const resp = await fetch(`/api/artistBio/${artistId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ regenerate: true }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setEditText(data.bio);
        // Don't update aiBlurb or originalBio - keep them so Discard can restore the previous bio
        toast({ title: "Bio regenerated" });
      } else {
        toast({ title: "Error regenerating bio", description: data?.message ?? "Please try again." });
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
      <div className="h-28 relative border border-gray-200 rounded-lg bg-white p-3 overflow-hidden">
        <p className="text-gray-500 italic">Loading summary...</p>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="mb-4">
        <textarea
          className="w-full border border-gray-200 rounded-lg p-3 text-black h-40"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          placeholder="Enter artist bio..."
        />
        <div className="flex justify-between items-center mt-2">
          {canEdit && (
            <Button
              variant="secondary"
              onClick={handleRegenerate}
              disabled={isRegenerating || isSaving}
            >
              {isRegenerating ? (
                <>
                  <img src="/spinner.svg" className="h-4 w-4 mr-1" alt="regenerating" />
                  Regenerating...
                </>
              ) : (
                "Regenerate"
              )}
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleDiscard} disabled={isSaving}>
              Discard
            </Button>
            <Button onClick={handleSave} disabled={isSaving || editText.trim() === (aiBlurb ?? "").trim()}>
              {isSaving ? <img src="/spinner.svg" className="h-4 w-4" alt="saving" /> : "Save"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Non-editing view
  return (
    <div className="mb-4">
      <div className="relative">
        {/* Initial text box */}
        <div className="h-28 relative border border-gray-200 rounded-lg bg-white p-3 overflow-hidden">
          {aiBlurb ? (
            <>
              <p className="text-black">{aiBlurb}</p>
              {aiBlurb && aiBlurb.length > 200 && (
                <>
                  {/* Gradient overlay */}
                  <div className="absolute bottom-0 right-2 w-32 h-8 bg-gradient-to-l from-white via-white/100 to-transparent pointer-events-none"></div>
                  <button
                    className="absolute bottom-1 right-2 bg-transparent text-blue-600 text-sm underline z-10"
                    onClick={() => setOpenModal(true)}
                  >
                    Read More
                  </button>
                </>
              )}
            </>
          ) : (
            <p className="text-gray-500 italic">No summary is available</p>
          )}
                 </div>
         {/* Expanded box */}
        {openModal && (
          <div className="absolute top-0 left-0 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-30 p-3 max-h-96 overflow-y-auto">
            <p className="text-black mb-4">{aiBlurb}</p>
            <button
              className="absolute right-2 bg-white text-blue-600 text-sm underline"
              onClick={() => setOpenModal(false)}
            >
              Show less
            </button>
          </div>
        )}
      </div>
    </div>
  );
}