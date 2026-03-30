import { requireAuth } from "@/lib/auth-helpers";
import { getUserById } from "@/server/utils/queries/userQueries";
import { getApprovedClaimForArtistByUserId } from "@/server/utils/queries/dashboardQueries";
import { setArtistLink, clearArtistLink } from "@/server/utils/artistLinkService";
import { extractArtistId } from "@/server/utils/services";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const start = performance.now();
    try {
        const authResult = await requireAuth();
        if (!authResult.authenticated) return authResult.response;

        const { artistId, action, url, siteName } = await req.json();

        if (!artistId || !action) {
            return Response.json({ error: "artistId and action are required" }, { status: 400 });
        }

        if (action !== "set" && action !== "clear") {
            return Response.json({ error: "action must be 'set' or 'clear'" }, { status: 400 });
        }

        // Authorization: admin can edit any artist, claimed artist can edit own profile only
        const user = await getUserById(authResult.userId);
        const isAdmin = !!user?.isAdmin;

        if (!isAdmin) {
            const claim = await getApprovedClaimForArtistByUserId(authResult.userId, artistId);
            if (!claim) {
                return Response.json({ error: "Not authorized to edit this artist" }, { status: 403 });
            }
        }

        if (action === "set") {
            if (!url) {
                return Response.json({ error: "url is required for set action" }, { status: 400 });
            }

            const extracted = await extractArtistId(url);
            if (!extracted?.siteName || !extracted?.id) {
                return Response.json({ error: "Could not identify platform from URL" }, { status: 400 });
            }

            await setArtistLink(artistId, extracted.siteName, extracted.id);
            return Response.json({ success: true, siteName: extracted.siteName, platformName: extracted.cardPlatformName });
        }

        if (action === "clear") {
            if (!siteName) {
                return Response.json({ error: "siteName is required for clear action" }, { status: 400 });
            }

            await clearArtistLink(artistId, siteName);
            return Response.json({ success: true });
        }

        return Response.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("[directEditLink] Error:", error);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    } finally {
        console.debug(`[directEditLink] POST took ${performance.now() - start}ms`);
    }
}
