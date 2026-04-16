"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { X, Plus } from "lucide-react";
import type { ArtistLink } from "@/server/utils/queries/artistQueries";
import type { UrlMap } from "@/server/db/DbTypes";

/** Platforms forced into "Support the Artist" regardless of DB flag */
const FORCE_SUPPORT_PLATFORMS = new Set(["bandcamp", "catalog", "sound", "supercollector"]);

interface DashboardLinksSectionProps {
    artistId: string;
    artistSpotify?: string | null;
    artistLinks: ArtistLink[];
    availableLinks: UrlMap[];
}

export default function DashboardLinksSection({
    artistId,
    artistSpotify,
    artistLinks,
    availableLinks,
}: DashboardLinksSectionProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [deletingSite, setDeletingSite] = useState<string | null>(null);
    const [addingTo, setAddingTo] = useState<"social" | "support" | null>(null);
    const [newUrl, setNewUrl] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const socialLinks = artistLinks.filter((el) => {
        if (el.siteName === "spotify") return false;
        const forcedSupport = FORCE_SUPPORT_PLATFORMS.has(el.siteName);
        return !el.isMonetized && !forcedSupport;
    });

    const supportLinks = artistLinks.filter((el) => {
        if (el.siteName === "spotify") return false;
        const forcedSupport = FORCE_SUPPORT_PLATFORMS.has(el.siteName);
        return el.isMonetized || forcedSupport;
    });

    // Build lists of platforms not yet added, split by category
    const existingSiteNames = new Set(artistLinks.map(l => l.siteName));
    const missingSocial = availableLinks.filter(p =>
        p.siteName !== "ens" && p.siteName !== "wallets" && p.siteName !== "spotify" &&
        !p.isMonetized && !FORCE_SUPPORT_PLATFORMS.has(p.siteName) &&
        !existingSiteNames.has(p.siteName)
    );
    const missingSupport = availableLinks.filter(p =>
        p.siteName !== "ens" && p.siteName !== "wallets" &&
        (p.isMonetized || FORCE_SUPPORT_PLATFORMS.has(p.siteName)) &&
        !existingSiteNames.has(p.siteName)
    );

    const handleDelete = async (siteName: string) => {
        setDeletingSite(siteName);
        try {
            const res = await fetch("/api/directEditLink", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ artistId, action: "clear", siteName }),
            });
            if (res.ok) {
                toast({ title: `Removed ${siteName}` });
                router.refresh();
            } else {
                const data = await res.json();
                toast({ title: "Error", description: data.error, variant: "destructive" });
            }
        } catch {
            toast({ title: "Error", description: "Failed to remove link", variant: "destructive" });
        } finally {
            setDeletingSite(null);
        }
    };

    const handleAdd = async () => {
        if (!newUrl.trim()) return;
        setSubmitting(true);
        let url = newUrl.trim();
        if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

        try {
            const res = await fetch("/api/directEditLink", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ artistId, action: "set", url }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast({ title: `Added ${data.platformName ?? data.siteName ?? "link"}` });
                setNewUrl("");
                setAddingTo(null);
                router.refresh();
            } else {
                toast({ title: "Error", description: data.error ?? "Failed to add link", variant: "destructive" });
            }
        } catch {
            toast({ title: "Error", description: "Failed to add link", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    const renderLinkRow = (link: ArtistLink) => (
        <div key={link.siteName} className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg glass-subtle">
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <img
                    src={link.siteImage ?? ""}
                    alt={link.cardPlatformName ?? link.siteName}
                    className="w-6 h-6 object-contain shrink-0"
                />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                        {link.cardPlatformName ?? link.siteName}
                    </p>
                    <a
                        href={link.artistUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-pastypink truncate block"
                    >
                        {link.artistUrl}
                    </a>
                </div>
            </div>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(link.siteName)}
                disabled={deletingSite === link.siteName}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500 shrink-0"
            >
                <X size={14} />
            </Button>
        </div>
    );

    const renderAddInput = (section: "social" | "support") => {
        if (addingTo !== section) return null;
        const platforms = section === "social" ? missingSocial : missingSupport;
        return (
            <div className="space-y-2">
                <div className="flex gap-2">
                    <Input
                        type="url"
                        placeholder={section === "social" ? "https://instagram.com/artistname" : "https://bandcamp.com/artistname"}
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                        className="flex-1 min-w-0"
                        autoFocus
                    />
                    <Button
                        onClick={handleAdd}
                        disabled={submitting || !newUrl.trim()}
                        className="bg-pastypink hover:bg-pastypink/80 text-white text-xs shrink-0"
                    >
                        {submitting ? "Adding..." : "Add"}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setAddingTo(null); setNewUrl(""); }}
                        className="h-9 w-9 p-0 shrink-0"
                    >
                        <X size={14} />
                    </Button>
                </div>
                {platforms.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        <span className="text-xs text-muted-foreground py-1">Available:</span>
                        {platforms.map(p => (
                            <span key={p.siteName} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">
                                {p.siteImage && <img src={p.siteImage} alt="" className="w-3 h-3" />}
                                {p.cardPlatformName ?? p.siteName}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="glass p-4 sm:p-5 space-y-5">
            <div>
                <h3 className="text-lg font-bold text-foreground">Manage Links</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Links are automatically sorted into Social or Support based on platform type.</p>
            </div>

            {/* Social Links */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">Social Links</p>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAddingTo(addingTo === "social" ? null : "social")}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-pastypink"
                    >
                        <Plus size={12} className="mr-1" />
                        Add
                    </Button>
                </div>
                {renderAddInput("social")}
                {artistSpotify && (
                    <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg glass-subtle">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <img src="/siteIcons/spotify_icon.svg" alt="Spotify" className="w-6 h-6 object-contain shrink-0" />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground">Spotify</p>
                                <a
                                    href={`https://open.spotify.com/artist/${artistSpotify}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-muted-foreground hover:text-pastypink truncate block"
                                >
                                    open.spotify.com/artist/{artistSpotify}
                                </a>
                            </div>
                        </div>
                    </div>
                )}
                {socialLinks.length > 0 ? (
                    socialLinks.map(renderLinkRow)
                ) : (
                    <p className="text-xs text-muted-foreground py-2">No social links yet.</p>
                )}
            </div>

            {/* Support Links */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">Support Links</p>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAddingTo(addingTo === "support" ? null : "support")}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-pastypink"
                    >
                        <Plus size={12} className="mr-1" />
                        Add
                    </Button>
                </div>
                {renderAddInput("support")}
                {supportLinks.length > 0 ? (
                    supportLinks.map(renderLinkRow)
                ) : (
                    <p className="text-xs text-muted-foreground py-2">No support links yet.</p>
                )}
            </div>
        </div>
    );
}
