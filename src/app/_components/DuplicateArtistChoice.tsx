"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    buildCanonicalArtistUrl,
    type SupportedArtistPlatform,
} from "@/lib/artist/artistProfileUrl";

export type DuplicateArtistCandidate = {
    id: string;
    name: string | null;
    spotify: string | null;
    deezer: string | null;
    imageUrl?: string | null;
};

export type SelectedArtistContext = {
    name?: string | null;
    imageUrl?: string | null;
};

type DuplicateArtistChoiceProps = {
    candidates: DuplicateArtistCandidate[];
    selectedArtist?: SelectedArtistContext;
    platform: SupportedArtistPlatform;
    platformId: string;
    message?: string;
    isCreatingSeparate: boolean;
    canCreateSeparate?: boolean;
    onCreateSeparate: () => void | Promise<void>;
    onChooseExisting?: () => void;
    onCancel?: () => void;
};

export default function DuplicateArtistChoice({
    candidates,
    selectedArtist,
    platform,
    platformId,
    message,
    isCreatingSeparate,
    canCreateSeparate = true,
    onCreateSeparate,
    onChooseExisting,
    onCancel,
}: DuplicateArtistChoiceProps) {
    if (isCreatingSeparate) {
        return (
            <section role="status" aria-live="polite" aria-busy="true" className="py-8 text-center text-foreground">
                <h3 className="font-semibold">Creating separate artist…</h3>
                <p className="mt-2 text-sm text-muted-foreground">The artist’s profile will open when it’s ready.</p>
            </section>
        );
    }

    const submittedUrl = buildCanonicalArtistUrl(platform, platformId);
    if (!submittedUrl) {
        return <p role="alert" className="text-sm text-destructive">We couldn&apos;t prepare this artist link. Please submit the URL again.</p>;
    }

    const selectedName = selectedArtist?.name || "Selected artist";
    const selectedPlatform = platform === "spotify" ? "Spotify" : "Deezer";
    const selectedLinks = [{ platform: selectedPlatform, href: submittedUrl }];
    const profiles = [
        { key: "selected", label: "You selected", name: selectedName, imageUrl: selectedArtist?.imageUrl, links: selectedLinks, candidate: null, index: 0 },
        ...candidates.map((candidate, index) => ({
            key: candidate.id,
            label: "Already on Music Nerd",
            name: candidate.name || "Unnamed artist",
            imageUrl: candidate.imageUrl,
            links: (["spotify", "deezer"] as const).flatMap((provider) => {
                const id = candidate[provider];
                const href = id ? buildCanonicalArtistUrl(provider, id) : null;
                return href ? [{ platform: provider === "spotify" ? "Spotify" : "Deezer", href }] : [];
            }),
            candidate,
            index,
        })),
    ];

    return (
        <section aria-label="Possible existing artists" className="space-y-4 text-foreground">
            <p className="text-sm leading-relaxed text-muted-foreground">
                {canCreateSeparate
                    ? "There’s already a profile with this name. Compare the links to check if it’s the same artist."
                    : message || "These platform profiles are linked to an existing artist. Review the link on that profile."}
            </p>

            <div className="space-y-3">
                {profiles.map((profile) => (
                    <Card key={profile.key} role="group" aria-label={profile.label} className="rounded-2xl border-black/10 bg-black/[0.025] p-4 shadow-none dark:border-white/10 dark:bg-white/[0.035]">
                        <p className="mb-3 text-xs font-medium text-muted-foreground">{profile.label}</p>
                        <div className="flex items-center gap-3">
                            {profile.imageUrl ? (
                                // The caller supplies an existing search/saved image; comparison never fetches catalog data.
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={profile.imageUrl} alt={profile.name} className="h-14 w-14 shrink-0 rounded-full object-cover" />
                            ) : (
                                <div aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-pastypink/15 text-foreground">
                                    <Music2 className="h-6 w-6" />
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <h3 className="break-words text-lg font-semibold leading-snug">{profile.name}</h3>
                                <div className="mt-1 flex flex-wrap gap-x-4">
                                    {profile.links.map((link) => (
                                        <a key={link.platform} href={link.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1 text-sm text-muted-foreground underline decoration-current/40 underline-offset-4 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-pastypink">
                                            {link.platform}<ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {profile.candidate && (
                            <Button asChild variant="pink" className="mt-4 w-full">
                                <Link href={`/artist/${profile.candidate.id}?addLink=${encodeURIComponent(submittedUrl)}`} onClick={onChooseExisting} aria-label={`Use existing profile: ${profile.name} (candidate ${profile.index + 1} of ${candidates.length})`}>
                                    Use existing profile
                                </Link>
                            </Button>
                        )}
                    </Card>
                ))}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">Review the link on that profile before adding it.</p>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-4 dark:border-white/10">
                {onCancel && <Button type="button" variant="glass" onClick={onCancel}><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back</Button>}
                {canCreateSeparate && <Button type="button" variant="glass" onClick={onCreateSeparate}>Add different artist</Button>}
            </div>
        </section>
    );
}
