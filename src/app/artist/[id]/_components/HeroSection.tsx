"use client";

import { useRef, useContext, useState, type ReactNode } from "react";
import Image from "next/image";
import { Camera, Play } from "lucide-react";
import { EditModeContext } from "@/app/_components/EditModeContext";
import { useToast } from "@/hooks/use-toast";

interface HeroSectionProps {
    imageUrl: string;
    artistName: string;
    artistId: string;
    hasPortrait?: boolean;
    bio?: string | null;
    listenUrl?: string | null;
    children?: ReactNode;
}

export default function HeroSection({ imageUrl, artistName, artistId, hasPortrait = false, bio, listenUrl, children }: HeroSectionProps) {
    const { isEditing } = useContext(EditModeContext);
    const { toast } = useToast();
    const [img, setImg] = useState(imageUrl);
    const [portrait, setPortrait] = useState(hasPortrait);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    async function handleImageUpload(file: File) {
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("artistId", artistId);
            const res = await fetch("/api/artist/profile-image", { method: "POST", body: fd });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.imagePath) {
                setImg(data.imagePath);
                setPortrait(true);
                toast({ title: "Photo updated" });
            } else {
                toast({ title: "Couldn't update photo", description: data.error || "Upload failed", variant: "destructive" });
            }
        } catch {
            toast({ title: "Couldn't update photo", description: "Network error", variant: "destructive" });
        } finally {
            setUploading(false);
        }
    }

    const photoControl = isEditing && <>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
            onChange={e => {
                const file = e.target.files?.[0];
                if (file) void handleImageUpload(file);
                e.target.value = "";
            }} />
        <button type="button" aria-label="Change photo" disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="absolute right-4 top-4 z-10 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/30 bg-black/60 px-4 text-xs font-medium text-white backdrop-blur-md hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pastypink disabled:opacity-60">
            <Camera size={16} aria-hidden="true" />{uploading ? "Uploading…" : "Change photo"}
        </button>
    </>;

    const identity = <>
        <h1 className={`break-words font-extrabold leading-[1.05] tracking-tight ${portrait ? 'text-[40px] text-white sm:text-[56px]' : 'text-3xl text-black dark:text-white sm:text-4xl'}`}>{artistName}</h1>
        {bio && <p className={`mt-3 max-w-xl text-sm leading-relaxed sm:text-base ${portrait ? 'text-white/85' : 'text-gray-600 dark:text-gray-300'}`}>{bio}</p>}
    </>;

    return <header className="space-y-4">
        {portrait ? <div data-artist-portrait className="relative -mx-4 min-h-[440px] overflow-hidden bg-[#1a1a1a] sm:mx-0 sm:min-h-[520px] sm:rounded-2xl">
            <Image src={img} alt={artistName} fill unoptimized priority sizes="(max-width: 800px) 100vw, 768px" className="object-cover object-top" />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-black/30 to-transparent" />
            {photoControl}
            <div className="relative flex min-h-[440px] flex-col justify-end px-5 pb-7 pt-48 sm:min-h-[520px] sm:px-8 sm:pb-8">
                {identity}
                <div className="mt-5 flex flex-wrap gap-3">
                    {listenUrl && <a href={listenUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-pastypink px-5 text-sm font-semibold text-gray-950 hover:bg-pink-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pastypink">Listen <Play size={14} fill="currentColor" aria-hidden="true" /></a>}
                    <a href="#mn-about" className="inline-flex min-h-11 items-center rounded-full border border-white/30 px-5 text-sm font-medium text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pastypink">Read the story</a>
                </div>
            </div>
        </div> : <>
            <div data-artist-fallback className="relative h-56 overflow-hidden rounded-2xl bg-neutral-800 md:h-72">
                <Image src={img} alt="" fill unoptimized sizes="(max-width: 800px) 100vw, 768px" className="scale-110 object-cover blur-2xl" />
                <div aria-hidden="true" className="absolute inset-0 bg-black/40" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Image src={img} alt={artistName} width={160} height={160} unoptimized priority className="h-32 w-32 rounded-full border-4 border-white/25 object-cover md:h-40 md:w-40" />
                </div>
                {photoControl}
            </div>
            <div className="text-center">{identity}</div>
            {listenUrl && <div className="flex justify-center"><a href={listenUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-pastypink px-5 text-sm font-semibold text-gray-950">Listen <Play size={14} fill="currentColor" aria-hidden="true" /></a></div>}
        </>}
        <div className={`flex flex-wrap items-center gap-2 ${portrait ? '' : 'justify-center'}`}>{children}</div>
    </header>;
}
