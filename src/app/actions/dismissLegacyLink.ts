"use server"

import { getServerAuthSession } from "@/server/auth";
import { dismissLegacyLink as dismissLegacyLinkQuery } from "@/server/utils/queries/userQueries";
import { trackServerEvent } from "@/server/utils/analytics/trackServerEvent";

export async function dismissLegacyLink(): Promise<{ success: boolean; error?: string }> {
    const session = await getServerAuthSession();

    if (!session) {
        return { success: false, error: "Not authenticated" };
    }

    try {
        await dismissLegacyLinkQuery(session.user.id);
        await trackServerEvent("profile_edit", { action: "dismiss", target: null });
        return { success: true };
    } catch (error) {
        console.error("[dismissLegacyLink] Error:", error);
        return { success: false, error: "Failed to dismiss legacy link prompt" };
    }
}
