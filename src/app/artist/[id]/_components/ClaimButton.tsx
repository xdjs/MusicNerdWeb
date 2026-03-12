"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { claimArtistProfile } from "@/app/actions/dashboardActions";
import { isDevMode } from "@/lib/dev-mode";
import Link from "next/link";

interface ClaimButtonProps {
    artistId: string;
    isClaimed: boolean;
    isClaimedByUser: boolean;
}

export default function ClaimButton({ artistId, isClaimed, isClaimedByUser }: ClaimButtonProps) {
    const [claimed, setClaimed] = useState(isClaimedByUser);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    // If claimed by another user, render nothing
    if (isClaimed && !isClaimedByUser && !claimed) {
        return null;
    }

    // Already claimed by current user
    if (claimed || isClaimedByUser) {
        return (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-pastypink/15 text-pastypink text-xs font-semibold">
                <ShieldCheck size={14} strokeWidth={2.5} />
                <span>Claimed</span>
            </div>
        );
    }

    const handleClaim = async () => {
        setLoading(true);
        try {
            const result = await claimArtistProfile(artistId);
            if (result.success) {
                setClaimed(true);
                if (typeof window !== "undefined") {
                    localStorage.setItem("dashboard_claimed", "true");
                }
                toast({
                    title: "Profile Claimed!",
                    description: (
                        <span>
                            You&apos;ve claimed this artist profile.{" "}
                            <Link href="/dashboard" className="underline font-semibold">
                                Go to Dashboard
                            </Link>
                        </span>
                    ),
                });
            } else if (result.alreadyClaimed) {
                toast({
                    title: "Already Claimed",
                    description: "This artist profile has already been claimed.",
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Error",
                    description: result.error ?? "Failed to claim profile.",
                    variant: "destructive",
                });
            }
        } catch {
            toast({
                title: "Error",
                description: "Something went wrong. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleClaim}
            disabled={loading}
            className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors duration-200",
                "bg-white text-pastypink border border-pastypink/50 hover:bg-pastypink hover:text-white"
            )}
        >
            <ShieldCheck size={14} strokeWidth={2.5} />
            {loading ? "Claiming..." : "Claim"}
        </Button>
    );
}
