"use client";

import { useRef, useContext, useState, type ReactNode } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";
import { EditModeContext } from "@/app/_components/EditModeContext";
import BlurbSection from "./BlurbSection";
import ListenPicker from "./ListenPicker";
import type { ProfileLink } from "@/lib/artistProfileLinks";
import { useToast } from "@/hooks/use-toast";

interface HeroSectionProps {
    imageUrl: string;
    artistName: string;
    artistId: string;
    hasPortrait?: boolean;
    bio?: string | null;
    listenLinks?: ProfileLink[];
    children?: ReactNode;
}

export default function HeroSection({ imageUrl, artistName, artistId, hasPortrait = false, bio, listenLinks = [], children }: HeroSectionProps) {
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
        <div id="mn-about" className="mt-3 max-w-xl"><BlurbSection artistName={artistName} artistId={artistId} initialBio={bio ?? ""} hero portrait={portrait} /></div>
    </>;

    return <header className="space-y-4">
        {portrait ? <div data-artist-portrait className="relative -mx-4 min-h-[440px] overflow-hidden bg-[#1a1a1a] sm:mx-0 sm:min-h-[520px] sm:rounded-2xl">
            <Image src={img} alt={artistName} fill unoptimized priority sizes="(max-width: 800px) 100vw, 768px" className="object-cover object-top" />
            <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.7)_180px,rgba(0,0,0,0.92)_340px,#111_100%)]" />
            {photoControl}
            <div className="relative flex min-h-[440px] flex-col justify-end px-5 pb-7 pt-48 sm:min-h-[520px] sm:px-8 sm:pb-8">
                {identity}
                <div className="mt-5 flex flex-wrap gap-3">
                    <ListenPicker artistName={artistName} links={listenLinks} />
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
            <div className="flex justify-center"><ListenPicker artistName={artistName} links={listenLinks} /></div>
        </>}
        <div className={`flex flex-wrap items-center gap-2 ${portrait ? '' : 'justify-center'}`}>{children}</div>
    </header>;
}
