"use client";

import { useContext, type ReactNode } from "react";
import { EditModeContext } from "@/app/_components/EditModeContext";
import RevealSection from "./RevealSection";
import PressAndFeatures from "./PressAndFeatures";
import BioVersionHistory from "./BioVersionHistory";
import VaultManager from "./VaultManager";
import type { ArtistVaultSource } from "@/server/db/DbTypes";

interface VaultSectionProps {
  children?: ReactNode;
  summary?: string | null;
  artistId: string;
  pendingSources: ArtistVaultSource[];
  approvedSources: ArtistVaultSource[];
}

export default function VaultSection({ artistId, pendingSources, approvedSources, children, summary }: VaultSectionProps) {
  const { isEditing, canEdit } = useContext(EditModeContext);

  return (
    <RevealSection className="glass p-4 sm:p-5 space-y-5">
      <h2 className="text-black dark:text-white text-xl font-bold">Lore</h2>
      <div id="mn-sources" className="space-y-3">
      {/* Public carousel only outside edit mode; VaultManager owns the approved
          list while editing (its own optimistic state) to avoid a stale-card flash. */}
      {!isEditing && approvedSources.length > 0 && <PressAndFeatures sources={approvedSources} summary={summary} />}
      {!isEditing && approvedSources.length === 0 && <p className="text-sm text-black/60 dark:text-white/65">No published sources yet. Articles, interviews and other sources will appear here.</p>}
      {canEdit && isEditing && (
        <><VaultManager artistId={artistId} pendingSources={pendingSources} approvedSources={approvedSources} />
        <div className="border-t border-black/10 pt-4 dark:border-white/10"><h3 className="mb-2 text-sm font-medium text-black dark:text-white">Saved bios</h3><BioVersionHistory artistId={artistId} showLockNotice={false} /></div></>
      )}
      </div>
      {children}
    </RevealSection>
  );
}
