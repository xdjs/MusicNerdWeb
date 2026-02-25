"use server"

import { getServerAuthSession } from "@/server/auth";
import { dismissLegacyLink as dismissLegacyLinkQuery } from "@/server/utils/queries/userQueries";

export async function dismissLegacyLink(): Promise<{ success: boolean; error?: string }> {
    const session = await getServerAuthSession();

    if (!session) {
        return { success: false, error: "Not authenticated" };
    }

    try {
        await dismissLegacyLinkQuery(session.user.id);
        return { success: true };
    } catch (error) {
        console.error("[dismissLegacyLink] Error:", error);
        return { success: false, error: "Failed to dismiss legacy link prompt" };
    }
}
