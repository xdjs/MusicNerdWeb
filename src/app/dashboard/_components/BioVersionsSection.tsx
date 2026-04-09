"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Pin, Trash2, Save, ChevronDown } from "lucide-react";
import { getArtistBioVersions, saveCurrentBio, pinBioVersionAction, deleteBioVersionAction } from "@/app/actions/dashboardActions";
import type { InferSelectModel } from "drizzle-orm";
import type { artistBioVersions } from "@/server/db/schema";

type BioVersion = InferSelectModel<typeof artistBioVersions>;

interface BioVersionsSectionProps {
    currentBio: string | null;
}

export default function BioVersionsSection({ currentBio }: BioVersionsSectionProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [versions, setVersions] = useState<BioVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [actionId, setActionId] = useState<string | null>(null);

    useEffect(() => {
        getArtistBioVersions().then(result => {
            if (result.success && result.versions) {
                setVersions(result.versions);
            }
            setLoading(false);
        });
    }, []);

    const handleSaveCurrent = async () => {
        if (!currentBio) return;
        setSaving(true);
        const result = await saveCurrentBio(currentBio);
        if (result.success) {
            toast({ title: "Bio saved to versions" });
            // Refresh versions list
            const updated = await getArtistBioVersions();
            if (updated.success && updated.versions) setVersions(updated.versions);
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setSaving(false);
    };

    const handlePin = async (versionId: string) => {
        setActionId(versionId);
        const result = await pinBioVersionAction(versionId);
        if (result.success) {
            toast({ title: "Bio pinned — now showing on your profile" });
            const updated = await getArtistBioVersions();
            if (updated.success && updated.versions) setVersions(updated.versions);
            router.refresh();
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setActionId(null);
    };

    const handleDelete = async (versionId: string) => {
        setActionId(versionId);
        const result = await deleteBioVersionAction(versionId);
        if (result.success) {
            toast({ title: "Bio version deleted" });
            setVersions(prev => prev.filter(v => v.id !== versionId));
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setActionId(null);
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr.endsWith("Z") ? dateStr : `${dateStr}Z`);
        return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    };

    return (
        <div className="glass p-5 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">Saved Bios</h3>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveCurrent}
                    disabled={saving || !currentBio}
                    className="text-xs border-pastypink/50 text-pastypink hover:bg-pastypink hover:text-white"
                >
                    <Save size={14} className="mr-1" />
                    {saving ? "Saving..." : "Save Current Bio"}
                </Button>
            </div>

            <p className="text-xs text-muted-foreground">
                Save your current bio before regenerating so you can switch back anytime.
            </p>

            {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
            ) : versions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No saved bios yet. Click &quot;Save Current Bio&quot; to save your first version.</p>
            ) : (
                <div className="space-y-2">
                    {(expanded ? versions : versions.slice(0, 3)).map((version) => (
                        <div
                            key={version.id}
                            className={`glass-subtle p-3 rounded-xl space-y-2 ${version.isPinned ? "ring-1 ring-pastypink/40" : ""}`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {version.isPinned && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pastypink/15 text-pastypink text-[10px] font-semibold">
                                            <Pin size={10} />
                                            Active
                                        </span>
                                    )}
                                    <span className="text-[11px] text-muted-foreground">
                                        {formatDate(version.createdAt)}
                                    </span>
                                </div>
                                <div className="flex gap-1">
                                    {!version.isPinned && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handlePin(version.id)}
                                            disabled={actionId === version.id}
                                            className="h-7 px-2 text-xs text-muted-foreground hover:text-pastypink"
                                        >
                                            <Pin size={12} className="mr-1" />
                                            Pin
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(version.id)}
                                        disabled={actionId === version.id}
                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                                    >
                                        <Trash2 size={12} />
                                    </Button>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                                {version.bioText}
                            </p>
                        </div>
                    ))}

                    {versions.length > 3 && (
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-muted-foreground hover:text-pastypink transition-colors"
                        >
                            <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
                            {expanded ? "Show less" : `Show ${versions.length - 3} more`}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
