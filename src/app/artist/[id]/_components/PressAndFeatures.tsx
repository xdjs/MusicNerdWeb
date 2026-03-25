"use client";

import { SOURCE_TYPE_COLORS, type SourceType } from "@/lib/sourceTypes";
import { ExternalLink } from "lucide-react";

interface VaultSource {
    id: string;
    url: string;
    title?: string | null;
    snippet?: string | null;
    type?: string | null;
}

interface PressAndFeaturesProps {
    sources: VaultSource[];
    artistName: string;
}

function getSourceDomain(url: string): string {
    try {
        return new URL(url).hostname.replace("www.", "");
    } catch {
        return url;
    }
}

const TYPE_LABELS: Record<string, string> = {
    article: "Article",
    interview: "Interview",
    review: "Review",
    profile: "Profile",
    news: "News",
    video: "Video",
    audio: "Audio",
    social: "Social",
    document: "Document",
    image: "Image",
    data: "Data",
};

export default function PressAndFeatures({ sources, artistName }: PressAndFeaturesProps) {
    if (sources.length === 0) return null;

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sources.map((source) => {
                    const type = (source.type ?? "article") as SourceType;
                    const colors = SOURCE_TYPE_COLORS[type] ?? SOURCE_TYPE_COLORS.article;

                    return (
                        <a
                            key={source.id}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group glass-subtle p-4 rounded-xl flex flex-col gap-2 hover:scale-[1.02] transition-all duration-300 hover:shadow-[0_0_20px_rgba(239,149,255,0.4)]"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <span
                                    className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${colors.bg} ${colors.text} ${colors.border} border`}
                                >
                                    {TYPE_LABELS[type] ?? "Article"}
                                </span>
                                <ExternalLink
                                    size={14}
                                    className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"
                                />
                            </div>
                            <h3 className="text-sm font-semibold text-black dark:text-white leading-snug line-clamp-2">
                                {source.title ?? "Untitled"}
                            </h3>
                            {source.snippet && (
                                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                                    {source.snippet}
                                </p>
                            )}
                            <span className="text-[11px] text-muted-foreground/60 mt-auto">
                                {getSourceDomain(source.url)}
                            </span>
                        </a>
                    );
                })}
            </div>
        </div>
    );
}
