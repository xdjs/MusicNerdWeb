"use client";

import { useContext, type ReactNode } from "react";
import { EditModeContext } from "@/app/_components/EditModeContext";
import RevealSection from "./RevealSection";
import PressAndFeatures from "./PressAndFeatures";
import BioVersionHistory from "./BioVersionHistory";
import VaultManager from "./VaultManager";
import SuggestLoreSource from "./SuggestLoreSource";
import { Button } from "@/components/ui/button";
import type { ArtistVaultSource } from "@/server/db/DbTypes";

interface VaultSectionProps {
  children?: ReactNode;
  artistId: string;
  isClaimed: boolean;
  pendingSources: ArtistVaultSource[];
  approvedSources: ArtistVaultSource[];
}

export default function VaultSection({ artistId, isClaimed, pendingSources, approvedSources, children }: VaultSectionProps) {
  const { isEditing, canEdit, toggle } = useContext(EditModeContext);

  return (
    <RevealSection editable className="glass p-4 sm:p-5 space-y-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-black dark:text-white text-xl font-bold">Lore</h2>
          {canEdit && !isEditing && <Button type="button" size="sm" variant="outline" onClick={toggle}>Add to Lore</Button>}
        </div>
        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">Stories, interviews, and other sources curated by the artist.</p>
      </div>
      <div id="mn-sources" className="space-y-3">
      {/* Public carousel only outside edit mode; VaultManager owns the approved
          list while editing (its own optimistic state) to avoid a stale-card flash. */}
      {!isEditing && <PressAndFeatures sources={approvedSources} />}
      {canEdit && isEditing && (
        <><VaultManager artistId={artistId} pendingSources={pendingSources} approvedSources={approvedSources} />
        <div className="border-t border-black/10 pt-4 dark:border-white/10"><h3 className="mb-2 text-sm font-medium text-black dark:text-white">Saved bios</h3><BioVersionHistory artistId={artistId} showLockNotice={false} /></div></>
      )}
      {!canEdit && <SuggestLoreSource artistId={artistId} isClaimed={isClaimed} />}
      </div>
      {children}
    </RevealSection>
  );
}
