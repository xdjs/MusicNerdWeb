"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMusicNerdUser } from "@/hooks/useMusicNerdUser";
import { requestUserApi } from "@/lib/user/requestUserApi";

// The standalone dashboard was folded into the artist profile's edit mode.
// This route is kept only as a redirect so old bookmarks/links don't 404:
// claimed owners land on their artist profile, everyone else on home.
export default function DashboardRedirect() {
    const router = useRouter();
    const { status } = useMusicNerdUser();

    useEffect(() => {
        if (status === "loading") return;
        if (status === "unauthenticated") {
            router.replace("/");
            return;
        }
        const controller = new AbortController();
        requestUserApi("/api/user/has-claim", { signal: controller.signal })
            .then(response => response.json())
            .then(({ artistId }) => router.replace(artistId ? `/artist/${artistId}` : "/"))
            .catch(() => {
                if (!controller.signal.aborted) router.replace("/");
            });
        return () => controller.abort();
    }, [status, router]);

    return null;
}
