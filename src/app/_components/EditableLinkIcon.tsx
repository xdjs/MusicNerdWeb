"use client"

import { useContext, useState, type ButtonHTMLAttributes } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { EditModeContext } from "./EditModeContext";
import { requestArtistLinkEdit } from "@/lib/artistLinks/requestArtistLinkEdit";
import { requestArtistLinkReview } from "@/lib/artistLinkReview/requestArtistLinkReview";
import { getDisplayedCatalogId } from "@/lib/artistLinks/getDisplayedCatalogId";
import { trackEvent } from "@/lib/analytics/trackEvent";

interface EditableLinkIconProps {
    href: string;
    siteName: string;
    artistId: string;
    iconSrc: string;
    label: string;
    canEdit?: boolean;
    sourceId?: string;
    dragHandleProps?: ButtonHTMLAttributes<HTMLButtonElement>;
    children?: React.ReactNode;
}

export default function EditableLinkIcon({
    href,
    siteName,
    artistId,
    iconSrc,
    label,
    canEdit = true,
    sourceId,
    dragHandleProps,
}: EditableLinkIconProps) {
    const { isEditing, refreshProfile } = useContext(EditModeContext);
    const [deleting, setDeleting] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDeleting(true);
        try {
            const res = sourceId
                ? await requestArtistLinkReview(artistId, { id: sourceId, kind: "source", decision: "remove" })
                : await requestArtistLinkEdit("directEditLink", {
                    artistId, action: "clear", siteName,
                    expectedValue: getDisplayedCatalogId(siteName, href),
                });
            if (res.ok) {
                if (!sourceId) trackEvent("profile_edit", { action: "link_remove", target: siteName });
                toast({ title: `Removed ${label}` });
                if (refreshProfile) refreshProfile(); else router.refresh();
            } else {
                const data = await res.json();
                toast({ title: "Error", description: data.error, variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to remove link", variant: "destructive" });
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="relative flex flex-col items-center gap-1.5 group">
            {dragHandleProps ? <button type="button" {...dragHandleProps}
                disabled={deleting || dragHandleProps.disabled}
                className="touch-none cursor-grab rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pastypink active:cursor-grabbing disabled:opacity-50">
                <div className="w-12 h-12 rounded-full backdrop-blur-sm bg-white/70 dark:bg-white/10 border border-white/40 dark:border-white/15 shadow-sm flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(239,149,255,0.45)] group-hover:bg-white/90 dark:group-hover:bg-white/20">
                    <img
                        src={iconSrc}
                        alt={label}
                        className="w-7 h-7 object-contain"
                    />
                </div>
            </button> : <a href={href} target="_blank" rel="noopener noreferrer" className={deleting ? "pointer-events-none opacity-50" : ""}>
                <div className="w-12 h-12 rounded-full backdrop-blur-sm bg-white/70 dark:bg-white/10 border border-white/40 dark:border-white/15 shadow-sm flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(239,149,255,0.45)] group-hover:bg-white/90 dark:group-hover:bg-white/20">
                    <img
                        src={iconSrc}
                        alt={label}
                        className="w-7 h-7 object-contain"
                    />
                </div>
            </a>}
            <span className="text-xs text-center text-muted-foreground leading-tight truncate w-full">
                {label}
            </span>
            {canEdit && isEditing && (
                <button
                    aria-label={`Remove ${label}`}
                    onClick={handleDelete}
                    disabled={deleting}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors z-10"
                >
                    <X size={12} />
                </button>
            )}
        </div>
    );
}
