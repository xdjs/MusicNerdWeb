"use client";

import { useContext, useState, type ReactNode } from "react";
import { EditModeContext } from "@/app/_components/EditModeContext";
import { ChevronDown } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import RevealSection from "./RevealSection";
import { isDestinationSource } from "@/lib/musicLinks/isDestinationSource";
import { getSourceReviewKey } from "@/lib/source/getSourceReviewKey";
import PressAndFeatures from "./PressAndFeatures";
import ResearchPending from "./onboarding/ResearchPending";
import ArtistInterviews from "./ArtistInterviews";
import ResearchNewCount from "./onboarding/ResearchNewCount";
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
  const [collapsed, setCollapsed] = useState(false);
  const pendingLore = pendingSources.filter(source => !isDestinationSource(source));
  const approvedLore = approvedSources.filter(source => !isDestinationSource(source));

  return (
    <RevealSection editable className="glass p-4 sm:p-5 space-y-5 transition-shadow has-[[data-research-new]]:ring-2 has-[[data-research-new]]:ring-highlightpink/70">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {isEditing ? <h2 className="flex-1 text-black dark:text-white text-xl font-bold"><button type="button" onClick={() => setCollapsed(!collapsed)} aria-expanded={!collapsed} aria-controls="lore-editor-content" className="flex min-h-11 w-full items-center justify-between gap-3 text-left" aria-label={collapsed ? 'Expand Lore' : 'Collapse Lore'}><span className="flex items-center gap-2.5">Lore <ResearchNewCount kind="sources" keys={approvedSources.map(source => source.id)} /></span><ChevronDown size={18} aria-hidden="true" className={`shrink-0 transition-transform motion-reduce:transition-none ${collapsed ? "" : "rotate-180"}`} /></button></h2> : <div className="flex items-center gap-2.5"><h2 className="text-black dark:text-white text-xl font-bold">Lore</h2><ResearchNewCount kind="sources" keys={approvedSources.map(source => source.id)} /></div>}
          {canEdit && !isEditing && <Button type="button" size="sm" variant="outline" className="text-black dark:text-white" onClick={toggle}>Add to Lore</Button>}
        </div>
        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{isEditing ? 'Review answers, manage your sources, and shape your story.' : 'Stories, interviews, and other sources curated by the artist.'}</p>
      </div>
      <div id="lore-editor-content" hidden={isEditing && collapsed}>
      {/* VaultManager owns the approved list in edit mode. */}
      <ResearchPending step="vault" skeleton="sources" label="reading what’s written about you…" arrivedLabel="Your Lore is ready">
        {!isEditing && <div id="mn-sources"><PressAndFeatures key={artistId} sources={approvedSources} /></div>}
      </ResearchPending>
      {canEdit && isEditing && <Tabs defaultValue="sources" className="space-y-5">
        <TabsList aria-label="Lore sections" className="sticky top-[76px] z-10 grid h-auto w-full grid-cols-3 rounded-xl border border-black/10 bg-white/95 p-1 backdrop-blur-md dark:border-white/15 dark:bg-[#202020]/95">
          <TabsTrigger value="sources" className="min-h-11 gap-1.5 rounded-lg px-1 text-xs text-gray-600 transition-colors data-[state=active]:bg-pink-500/10 data-[state=active]:text-pink-800 data-[state=active]:shadow-none dark:text-gray-300 dark:data-[state=active]:text-pink-200 sm:text-sm">Lore <span className="text-[10px] opacity-70">{approvedLore.length + pendingLore.length}</span></TabsTrigger>
          <TabsTrigger value="questions" className="min-h-11 gap-1.5 rounded-lg px-1 text-xs text-gray-600 transition-colors data-[state=active]:bg-pink-500/10 data-[state=active]:text-pink-800 data-[state=active]:shadow-none dark:text-gray-300 dark:data-[state=active]:text-pink-200 sm:text-sm">Questions</TabsTrigger>
          <TabsTrigger value="bios" className="min-h-11 rounded-lg px-1 text-xs text-gray-600 transition-colors data-[state=active]:bg-pink-500/10 data-[state=active]:text-pink-800 data-[state=active]:shadow-none dark:text-gray-300 dark:data-[state=active]:text-pink-200 sm:text-sm">Bios</TabsTrigger>
        </TabsList>
        <TabsContent value="questions" forceMount className="data-[state=inactive]:hidden"><ArtistInterviews key={artistId} artistId={artistId} /></TabsContent>
        <TabsContent value="sources" forceMount className="data-[state=inactive]:hidden"><div id="mn-sources"><VaultManager key={getSourceReviewKey(artistId, 'lore', pendingLore, approvedLore)} artistId={artistId} pendingSources={pendingLore} approvedSources={approvedLore} /><ResearchDiscoveryReview key={artistId} artistId={artistId} /></div></TabsContent>
        <TabsContent value="bios" forceMount className="data-[state=inactive]:hidden"><h3 className="text-base font-semibold text-foreground">Saved bios</h3><BioVersionHistory artistId={artistId} showLockNotice={false} /></TabsContent>
      </Tabs>}
      {!canEdit && <SuggestLoreSource artistId={artistId} isClaimed={isClaimed} autoApprove={autoApprove} />}
      </div>
      {children}
    </RevealSection>
  );
}
