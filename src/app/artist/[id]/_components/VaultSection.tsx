"use client";

import { useContext, type ReactNode } from "react";
import { EditModeContext } from "@/app/_components/EditModeContext";
import RevealSection from "./RevealSection";
import { isDestinationSource } from "@/lib/musicLinks/isDestinationSource";
import { getSourceReviewKey } from "@/lib/source/getSourceReviewKey";
import PressAndFeatures from "./PressAndFeatures";
import ResearchPending from "./onboarding/ResearchPending";
import BioVersionHistory from "./BioVersionHistory";
import VaultManager from "./VaultManager";
import ResearchDiscoveryReview from "./ResearchDiscoveryReview";
import SuggestLoreSource from "./SuggestLoreSource";
import { Button } from "@/components/ui/button";
import type { ArtistVaultSource } from "@/server/db/DbTypes";

interface VaultSectionProps {
  children?: ReactNode;
  artistId: string;
  isClaimed: boolean;
  autoApprove?: boolean;
  pendingSources: ArtistVaultSource[];
  approvedSources: ArtistVaultSource[];
}

export default function VaultSection({ artistId, isClaimed, autoApprove = false, pendingSources, approvedSources, children }: VaultSectionProps) {
  const { isEditing, canEdit, toggle } = useContext(EditModeContext);
  const pendingLore = pendingSources.filter(source => !isDestinationSource(source));
  const approvedLore = approvedSources.filter(source => !isDestinationSource(source));

  return (
    <RevealSection editable className="glass p-4 sm:p-5 space-y-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-black dark:text-white text-xl font-bold">Lore</h2>
          {canEdit && !isEditing && <Button type="button" size="sm" variant="outline" className="text-black dark:text-white" onClick={toggle}>Add to Lore</Button>}
        </div>
        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">Stories, interviews, and other sources curated by the artist.</p>
      </div>
      <div id="mn-sources" className="space-y-3">
      {/* Public carousel only outside edit mode; VaultManager owns the approved
          list while editing (its own optimistic state) to avoid a stale-card flash. */}
      <ResearchPending step="vault" label="reading what’s written about you…">
        {!isEditing && <PressAndFeatures key={artistId} sources={approvedSources} />}
      </ResearchPending>
      {canEdit && isEditing && (
        <><VaultManager key={getSourceReviewKey(artistId, 'lore', pendingLore, approvedLore)} artistId={artistId} pendingSources={pendingLore} approvedSources={approvedLore} />
        <ResearchDiscoveryReview key={artistId} artistId={artistId} />
        <div className="border-t border-black/10 pt-4 dark:border-white/10"><h3 className="mb-2 text-sm font-medium text-black dark:text-white">Saved bios</h3><BioVersionHistory artistId={artistId} showLockNotice={false} /></div></>
      )}
      {!canEdit && <SuggestLoreSource artistId={artistId} isClaimed={isClaimed} autoApprove={autoApprove} />}
      </div>
      {children}
    </RevealSection>
  );
}
