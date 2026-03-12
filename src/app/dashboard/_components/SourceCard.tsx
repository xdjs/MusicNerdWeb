"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, ExternalLink, FileText, Image, Music, File, Trash2 } from "lucide-react";
import type { ArtistVaultSource } from "@/server/db/DbTypes";

interface SourceCardProps {
    source: ArtistVaultSource;
    onApprove?: (id: string) => void;
    onReject?: (id: string) => void;
    onDelete?: (id: string) => void;
    showActions: boolean;
    selected?: boolean;
    onSelect?: (id: string) => void;
}

function getFileIcon(contentType?: string | null) {
    if (!contentType) return null;
    if (contentType.startsWith("image/")) return <Image size={14} className="text-blue-500" />;
    if (contentType.startsWith("audio/")) return <Music size={14} className="text-purple-500" />;
    if (contentType === "application/pdf" || contentType.includes("word") || contentType.startsWith("text/"))
        return <FileText size={14} className="text-orange-500" />;
    return <File size={14} className="text-gray-500" />;
}

function formatFileSize(bytes?: number | null): string {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SourceCard({ source, onApprove, onReject, onDelete, showActions, selected, onSelect }: SourceCardProps) {
    const isFile = !!source.fileName;

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 transition-shadow hover:shadow-xl ${selected ? "ring-2 ring-pastypink" : ""}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    {onSelect && (
                        <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => onSelect(source.id)}
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-pastypink focus:ring-pastypink cursor-pointer"
                        />
                    )}
                    <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        {isFile && getFileIcon(source.contentType)}
                        <h3 className="font-semibold text-sm text-black dark:text-white leading-snug">
                            {source.title ?? source.fileName ?? "Untitled Source"}
                        </h3>
                    </div>
                    {isFile ? (
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                                {source.contentType?.split("/").pop()?.toUpperCase()}
                            </span>
                            {source.fileSize && (
                                <span className="text-xs text-muted-foreground">
                                    {formatFileSize(source.fileSize)}
                                </span>
                            )}
                            <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-pastypink hover:underline"
                            >
                                <ExternalLink size={11} className="flex-shrink-0" />
                                View file
                            </a>
                        </div>
                    ) : (
                        <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-pastypink hover:underline mt-1 truncate max-w-full"
                        >
                            <ExternalLink size={11} className="flex-shrink-0" />
                            <span className="truncate">{source.url}</span>
                        </a>
                    )}
                    </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isFile && (
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 capitalize border-pastypink/30 text-pastypink">
                            file
                        </Badge>
                    )}
                    {source.type && (
                        <Badge variant="secondary" className="text-[10px] px-2 py-0.5 capitalize">
                            {source.type}
                        </Badge>
                    )}
                    {onDelete && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(source.id)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                        >
                            <Trash2 size={14} />
                        </Button>
                    )}
                </div>
            </div>
            {source.snippet && (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-2">
                    {source.snippet}
                </p>
            )}
            {source.extractedText && !source.snippet && (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-2 italic">
                    {source.extractedText.slice(0, 200)}
                </p>
            )}
            {showActions && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <Button
                        size="sm"
                        onClick={() => onApprove?.(source.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-3"
                    >
                        <Check size={13} className="mr-1" />
                        Approve
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onReject?.(source.id)}
                        className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 text-xs h-7 px-3"
                    >
                        <X size={13} className="mr-1" />
                        Reject
                    </Button>
                </div>
            )}
        </div>
    );
}
