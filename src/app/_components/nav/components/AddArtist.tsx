"use client"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input";
import { useRef, useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
    FormLabel,
    FormDescription,
} from "@/components/ui/form";
import { addArtist } from "@/app/actions/addArtist";
import type { AddArtistResp } from "@/app/actions/serverActions";
import { cn } from "@/lib/utils";
import { Plus } from 'lucide-react';
import { useSession } from "next-auth/react";
import DuplicateArtistChoice from "@/app/_components/DuplicateArtistChoice";
import { parseSupportedArtistUrl } from "@/lib/artistProfileUrl";

const formSchema = z.object({
    artistUrl: z.string().refine(
        (val) => parseSupportedArtistUrl(val) !== null,
        { message: "Enter a Spotify or Deezer artist URL (e.g. https://open.spotify.com/artist/... or https://www.deezer.com/artist/...)" },
    ),
})

export default function AddArtist() {
    const { data: session, status: sessionStatus } = useSession();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreatingSeparate, setIsCreatingSeparate] = useState(false);
    const [addedArtist, setAddedArtist] = useState<{ artistId: string | undefined, artistName: string | undefined } | null>(null);
    const [addArtistStatus, setAddArtistStatus] = useState<AddArtistResp | null>(null);
    const requestGenerationRef = useRef(0);
    const requestInFlightRef = useRef(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        mode: "onSubmit",
        defaultValues: {
            artistUrl: "",
        },
    })

    function applyResponse(resp: AddArtistResp) {
        setAddArtistStatus(resp);
        if (resp.status === "success" || resp.status === "exists") {
            setAddedArtist({ artistId: resp.artistId, artistName: resp.artistName });
        } else {
            setAddedArtist(null);
        }
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const parsed = parseSupportedArtistUrl(values.artistUrl);
        if (!parsed || requestInFlightRef.current) return null;

        const requestGeneration = ++requestGenerationRef.current;
        requestInFlightRef.current = true;
        setIsLoading(true);
        setAddedArtist(null);

        try {
            const response = await addArtist(parsed.id, parsed.platform);
            if (requestGenerationRef.current === requestGeneration) {
                applyResponse(response);
            }
        } catch (error) {
            console.error("[AddArtist] Error adding artist:", error);
            if (requestGenerationRef.current === requestGeneration) {
                applyResponse({ status: "error", message: "Failed to add artist. Please try again." });
            }
        } finally {
            requestInFlightRef.current = false;
            setIsLoading(false);
        }
    }

    async function handleCreateSeparate() {
        if (
            addArtistStatus?.status !== "possible_duplicate"
            || addArtistStatus.canCreateSeparate === false
            || requestInFlightRef.current
        ) return;

        const requestGeneration = ++requestGenerationRef.current;
        requestInFlightRef.current = true;
        setIsCreatingSeparate(true);
        try {
            const resp = await addArtist(
                addArtistStatus.platformId,
                addArtistStatus.platform,
                { forceCreate: true },
            );
            if (requestGenerationRef.current === requestGeneration) {
                applyResponse(resp);
            }
        } catch (error) {
            console.error("[AddArtist] Error creating separate artist:", error);
            if (requestGenerationRef.current === requestGeneration) {
                applyResponse({ status: "error", message: "Failed to create the artist. Please try again." });
            }
        } finally {
            requestInFlightRef.current = false;
            setIsCreatingSeparate(false);
        }
    }

    function clearCurrentResponse() {
        if (isCreatingSeparate) return;

        requestGenerationRef.current += 1;
        setAddArtistStatus(null);
        setAddedArtist(null);
    }

    function closeModal(isOpen: boolean) {
        if (!isOpen && isCreatingSeparate) return;

        requestGenerationRef.current += 1;
        setIsModalOpen(isOpen);
        setAddArtistStatus(null);
        setAddedArtist(null);
        form.reset();
    }

    function handleAddArtistClick() {
        if (sessionStatus === "loading") return;

        if (session) {
            setIsModalOpen(true);
        } else {
            const loginButton = document.getElementById("login-btn");
            if (loginButton) {
                loginButton.click();
            } else if (process.env.NODE_ENV !== "production") {
                console.warn("[AddArtist] #login-btn not found — cannot prompt login");
            }
        }
    }

    return (
        <>
            <Button
                className="text-black p-3 bg-pastyblue rounded-lg border-none hover:bg-gray-200 transition-colors duration-300 w-10 h-10 sm:w-12 sm:h-12 shrink-0"
                onClick={handleAddArtistClick}
                aria-label="Add new artist"
                title="Add new artist"
                disabled={sessionStatus === "loading"}
                size="lg"
            >
                <Plus color="white" aria-hidden="true" />
            </Button>

            <Dialog open={isModalOpen} onOpenChange={closeModal}>
                <DialogContent
                    aria-busy={isCreatingSeparate}
                    onEscapeKeyDown={(event) => {
                        if (isCreatingSeparate) event.preventDefault();
                    }}
                    onPointerDownOutside={(event) => {
                        if (isCreatingSeparate) event.preventDefault();
                    }}
                    className={`artist-link-panel max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-2xl border-white/15 bg-neutral-950/80 bg-gradient-to-br from-white/[0.08] via-transparent to-white/[0.02] p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl backdrop-saturate-150 dark:bg-neutral-950/80 sm:rounded-2xl sm:p-6 ${isCreatingSeparate ? "min-h-48" : ""}`}
                >
                    {isCreatingSeparate ? (
                        <div
                            role="status"
                            aria-live="polite"
                            className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-neutral-950/95 p-6 text-center text-white"
                        >
                            <p className="font-semibold">Creating separate artist…</p>
                            <p className="mt-1 text-sm text-white/60">
                                Please wait while the artist is created. This action cannot be cancelled.
                            </p>
                        </div>
                    ) : (
                        <>
                            <DialogHeader className="space-y-2 pr-7 text-left">
                                <DialogTitle className="text-xl font-semibold leading-snug tracking-tight">Add new artist</DialogTitle>
                                <DialogDescription className="text-sm leading-relaxed text-white/60">
                                    Add an artist by pasting their Spotify or Deezer URL
                                </DialogDescription>
                            </DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                                    <FormField
                                        control={form.control}
                                        name="artistUrl"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-sm font-medium text-white/80">Artist URL</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Paste a Spotify or Deezer artist URL"
                                                        autoCapitalize="none"
                                                        autoCorrect="off"
                                                        spellCheck={false}
                                                        className="min-h-12 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-3 text-sm text-white/90 placeholder:text-white/45 outline-none transition-colors focus:border-pastypink/50 focus:ring-1 focus:ring-pastypink/30"
                                                        {...field}
                                                        disabled={isCreatingSeparate}
                                                        onChange={(event) => {
                                                            field.onChange(event);
                                                            clearCurrentResponse();
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormDescription className="text-xs leading-relaxed text-white/50">
                                                    Copy the URL from the artist&apos;s Spotify or Deezer page
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div>
                                        <Button
                                            type="submit"
                                            disabled={isLoading || isCreatingSeparate || addArtistStatus?.status === "possible_duplicate"}
                                            variant="pink"
                                            className="w-full"
                                        >
                                            {isLoading ?
                                                <img className="max-h-6" src="/spinner.svg" alt="Adding artist" />
                                                : <span>Add Artist</span>
                                            }
                                        </Button>
                                        {addArtistStatus && addArtistStatus.status !== "possible_duplicate" &&
                                            <p
                                                aria-live="polite"
                                                className={cn(
                                                    addArtistStatus.status === "error" || addArtistStatus.status === "conflict"
                                                        ? "mt-3 text-sm text-red-400"
                                                        : "mt-3 text-sm text-green-400",
                                                )}
                                            >
                                                {addArtistStatus.message}
                                            </p>
                                        }
                                        {addArtistStatus?.status === "possible_duplicate" && (
                                            <DuplicateArtistChoice
                                                glass
                                                candidates={addArtistStatus.candidates}
                                                platform={addArtistStatus.platform}
                                                platformId={addArtistStatus.platformId}
                                                message={addArtistStatus.message}
                                                isCreatingSeparate={isCreatingSeparate}
                                                canCreateSeparate={addArtistStatus.canCreateSeparate}
                                                onCreateSeparate={handleCreateSeparate}
                                                onChooseExisting={() => closeModal(false)}
                                            />
                                        )}
                                        <div className="mt-3 flex flex-col gap-2 text-white/90 overflow-auto">
                                            {addedArtist &&
                                                <>
                                                    <Button asChild variant="glass" className="border-white/15 bg-white/5 text-white/90 hover:bg-white/10 hover:text-white" key="check-out">
                                                        <Link onClick={() => closeModal(false)} href={`/artist/${addedArtist.artistId}`}>
                                                            Check out {addedArtist.artistName}
                                                        </Link>
                                                    </Button>
                                                    <Button asChild variant="glass" className="border-white/15 bg-white/5 text-white/90 hover:bg-white/10 hover:text-white" key="add-data">
                                                        <Link onClick={() => closeModal(false)} href={`/artist/${addedArtist.artistId}?opADM=1`}>
                                                            Add links for {addedArtist.artistName}
                                                        </Link>
                                                    </Button>
                                                </>
                                            }
                                        </div>
                                    </div>
                                </form>
                            </Form>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
