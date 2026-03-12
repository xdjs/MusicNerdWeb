"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { updateSourceStatus, seedMockSources, addVaultSource, searchWebForSources, removeVaultSource, removeVaultSources } from "@/app/actions/dashboardActions";
import SourceCard from "./SourceCard";
import Link from "next/link";
import { Plus, Database, Upload, FileText, Globe, CheckCircle2, XCircle, Loader2, Trash2, ExternalLink, Camera } from "lucide-react";
import type { ArtistVaultSource } from "@/server/db/DbTypes";

interface FileUploadStatus {
    name: string;
    status: "uploading" | "done" | "error";
    error?: string;
}

interface DashboardContentProps {
    artistName: string;
    artistId: string;
    artistImage: string;
    pendingSources: ArtistVaultSource[];
    approvedSources: ArtistVaultSource[];
}

export default function DashboardContent({
    artistName,
    artistId,
    artistImage,
    pendingSources,
    approvedSources,
}: DashboardContentProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [newUrl, setNewUrl] = useState("");
    const [addingUrl, setAddingUrl] = useState(false);
    const [uploadFiles, setUploadFiles] = useState<FileUploadStatus[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [deleting, setDeleting] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [currentImage, setCurrentImage] = useState(artistImage);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleApprove = async (sourceId: string) => {
        const result = await updateSourceStatus(sourceId, "approved");
        if (result.success) {
            toast({ title: "Source approved", description: "Moved to your vault." });
            router.refresh();
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };

    const handleReject = async (sourceId: string) => {
        const result = await updateSourceStatus(sourceId, "rejected");
        if (result.success) {
            toast({ title: "Source rejected", description: "Removed from pending." });
            router.refresh();
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };

    const handleDelete = async (sourceId: string) => {
        const result = await removeVaultSource(sourceId);
        if (result.success) {
            toast({ title: "Source deleted" });
            selectedIds.delete(sourceId);
            setSelectedIds(new Set(selectedIds));
            router.refresh();
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        setDeleting(true);
        const result = await removeVaultSources(Array.from(selectedIds));
        if (result.success) {
            toast({ title: `${result.count} source${(result.count ?? 0) > 1 ? "s" : ""} deleted` });
            setSelectedIds(new Set());
            router.refresh();
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setDeleting(false);
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const selectAllApproved = () => {
        if (selectedIds.size === approvedSources.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(approvedSources.map(s => s.id)));
        }
    };

    const handleProfileImageUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const file = files[0];
        setUploadingImage(true);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("artistId", artistId);

        try {
            const res = await fetch("/api/artist/profile-image", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (data.success) {
                setCurrentImage(data.imagePath);
                toast({ title: "Profile image updated" });
                router.refresh();
            } else {
                toast({ title: "Error", description: data.error, variant: "destructive" });
            }
        } catch {
            toast({ title: "Error", description: "Failed to upload image", variant: "destructive" });
        }

        setUploadingImage(false);
        if (imageInputRef.current) imageInputRef.current.value = "";
    };

    const handleWebSearch = async () => {
        setSearching(true);
        const result = await searchWebForSources(artistId);
        if (result.success) {
            toast({ title: "Web search complete", description: `Found ${result.count ?? 0} sources. Review them in the Pending tab.` });
            router.refresh();
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setSearching(false);
    };

    const handleSeed = async () => {
        setLoading(true);
        const result = await seedMockSources(artistId);
        if (result.success) {
            toast({ title: "Mock data seeded", description: "5 pending sources added." });
            router.refresh();
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setLoading(false);
    };

    const handleAddUrl = async () => {
        if (!newUrl.trim()) return;
        setAddingUrl(true);
        const result = await addVaultSource(artistId, newUrl.trim());
        if (result.success) {
            toast({ title: "Source added", description: "Added to pending sources." });
            setNewUrl("");
            router.refresh();
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setAddingUrl(false);
    };

    const handleFileUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const fileArray = Array.from(files);
        const initialStatuses: FileUploadStatus[] = fileArray.map(f => ({
            name: f.name,
            status: "uploading",
        }));
        setUploadFiles(initialStatuses);

        let successCount = 0;

        for (let i = 0; i < fileArray.length; i++) {
            const file = fileArray[i];
            const formData = new FormData();
            formData.append("file", file);
            formData.append("artistId", artistId);

            try {
                const res = await fetch("/api/vault/upload", {
                    method: "POST",
                    body: formData,
                });
                const data = await res.json();
                if (data.success) {
                    successCount++;
                    setUploadFiles(prev => prev.map((f, idx) =>
                        idx === i ? { ...f, status: "done" } : f
                    ));
                } else {
                    setUploadFiles(prev => prev.map((f, idx) =>
                        idx === i ? { ...f, status: "error", error: data.error || "Upload failed" } : f
                    ));
                }
            } catch {
                setUploadFiles(prev => prev.map((f, idx) =>
                    idx === i ? { ...f, status: "error", error: "Network error" } : f
                ));
            }
        }

        if (successCount > 0) {
            toast({
                title: `${successCount} file${successCount > 1 ? "s" : ""} added to vault`,
                description: "Files are now available in your approved sources.",
            });
            router.refresh();
        }

        // Clear the file list after a delay so the user can see final states
        setTimeout(() => setUploadFiles([]), 3000);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        handleFileUpload(e.dataTransfer.files);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-4">
                    {/* Profile image with upload overlay */}
                    <div
                        className="relative group w-16 h-16 rounded-full overflow-hidden shrink-0 cursor-pointer border-2 border-gray-200 dark:border-gray-600"
                        onClick={() => imageInputRef.current?.click()}
                    >
                        <img
                            src={currentImage}
                            alt={artistName}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            {uploadingImage ? (
                                <Loader2 size={18} className="animate-spin text-white" />
                            ) : (
                                <Camera size={18} className="text-white" />
                            )}
                        </div>
                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={(e) => handleProfileImageUpload(e.target.files)}
                            className="hidden"
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground">Managing</p>
                        <h2 className="text-2xl font-bold text-black dark:text-white">
                            {artistName}
                        </h2>
                        <Link
                            href={`/artist/${artistId}`}
                            className="inline-flex items-center gap-1 text-xs text-pastypink hover:underline mt-0.5"
                        >
                            <ExternalLink size={11} />
                            View Profile
                        </Link>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            size="sm"
                            onClick={handleWebSearch}
                            disabled={searching}
                            className="bg-pastypink hover:bg-pastypink/80 text-white text-xs"
                        >
                            <Globe size={14} className="mr-1.5" />
                            {searching ? "Searching..." : "Search Web"}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSeed}
                            disabled={loading}
                            className="text-xs"
                        >
                            <Database size={14} className="mr-1.5" />
                            {loading ? "Seeding..." : "Seed Mock Data"}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Add Source: URL + File Upload */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 space-y-4">
                {/* URL input */}
                <div>
                    <p className="text-sm font-medium text-black dark:text-white mb-2">Add a source URL</p>
                    <div className="flex gap-2">
                        <Input
                            type="url"
                            placeholder="https://pitchfork.com/reviews/..."
                            value={newUrl}
                            onChange={(e) => setNewUrl(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
                            className="flex-1"
                        />
                        <Button
                            onClick={handleAddUrl}
                            disabled={addingUrl || !newUrl.trim()}
                            size="sm"
                            className="bg-pastypink hover:bg-pastypink/80 text-white"
                        >
                            <Plus size={16} className="mr-1" />
                            {addingUrl ? "Adding..." : "Add"}
                        </Button>
                    </div>
                </div>

                {/* Divider */}
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-200 dark:border-gray-700" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                        <span className="bg-white dark:bg-gray-800 px-2 text-muted-foreground">or</span>
                    </div>
                </div>

                {/* File upload drop zone */}
                <div>
                    <p className="text-sm font-medium text-black dark:text-white mb-2">Upload files</p>
                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        className={`
                            border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
                            ${dragOver
                                ? "border-pastypink bg-pastypink/5"
                                : "border-gray-300 dark:border-gray-600 hover:border-pastypink/50"
                            }
                        `}
                        onClick={() => uploadFiles.length === 0 && fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".pdf,.txt,.md,.csv,.json,.doc,.docx,.png,.jpg,.jpeg,.webp,.mp3,.wav"
                            onChange={(e) => handleFileUpload(e.target.files)}
                            className="hidden"
                        />
                        {uploadFiles.length > 0 ? (
                            <div className="w-full space-y-2 text-left" onClick={(e) => e.stopPropagation()}>
                                {uploadFiles.map((f, i) => (
                                    <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded bg-gray-50 dark:bg-gray-700/50">
                                        {f.status === "uploading" && (
                                            <Loader2 size={16} className="animate-spin text-pastypink shrink-0" />
                                        )}
                                        {f.status === "done" && (
                                            <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                                        )}
                                        {f.status === "error" && (
                                            <XCircle size={16} className="text-red-500 shrink-0" />
                                        )}
                                        <span className="text-sm truncate flex-1 text-black dark:text-white">
                                            {f.name}
                                        </span>
                                        <span className="text-xs text-muted-foreground shrink-0">
                                            {f.status === "uploading" && "Uploading..."}
                                            {f.status === "done" && "Added"}
                                            {f.status === "error" && (f.error ?? "Failed")}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <Upload size={20} />
                                    <FileText size={20} />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Drag & drop files here, or click to browse
                                </p>
                                <p className="text-xs text-muted-foreground/70">
                                    PDF, TXT, MD, CSV, JSON, DOCX, images, audio (max 10MB)
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="pending">
                <TabsList className="w-full justify-start">
                    <TabsTrigger value="pending" className="flex-1 sm:flex-none">
                        Pending ({pendingSources.length})
                    </TabsTrigger>
                    <TabsTrigger value="approved" className="flex-1 sm:flex-none">
                        Approved ({approvedSources.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="space-y-3 mt-4">
                    {pendingSources.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
                            <p className="text-muted-foreground">No pending sources to review.</p>
                            <p className="text-xs text-muted-foreground mt-1">Add a URL, upload files, or seed mock data to get started.</p>
                        </div>
                    ) : (
                        pendingSources.map((source) => (
                            <SourceCard
                                key={source.id}
                                source={source}
                                onApprove={handleApprove}
                                onReject={handleReject}
                                onDelete={handleDelete}
                                showActions
                            />
                        ))
                    )}
                </TabsContent>

                <TabsContent value="approved" className="space-y-3 mt-4">
                    {approvedSources.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
                            <p className="text-muted-foreground">
                                No approved sources yet. Review pending sources to build your vault.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.size === approvedSources.length && approvedSources.length > 0}
                                        onChange={selectAllApproved}
                                        className="h-4 w-4 rounded border-gray-300 text-pastypink focus:ring-pastypink"
                                    />
                                    Select all
                                </label>
                                {selectedIds.size > 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleBulkDelete}
                                        disabled={deleting}
                                        className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 text-xs h-7"
                                    >
                                        <Trash2 size={13} className="mr-1" />
                                        {deleting ? "Deleting..." : `Delete ${selectedIds.size} selected`}
                                    </Button>
                                )}
                            </div>
                            {approvedSources.map((source) => (
                                <SourceCard
                                    key={source.id}
                                    source={source}
                                    showActions={false}
                                    onDelete={handleDelete}
                                    selected={selectedIds.has(source.id)}
                                    onSelect={toggleSelect}
                                />
                            ))}
                        </>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
