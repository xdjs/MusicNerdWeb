import { db } from "@/server/db/drizzle";
import { eq } from "drizzle-orm";
import { ugcresearch } from "@/server/db/schema";
import { getServerAuthSession } from "@/server/auth";

export async function getUgcStats() {
    const user = await getServerAuthSession();
    if (!user) throw new Error("Not authenticated");
    try {
        const ugcList = await db.query.ugcresearch.findMany({ where: eq(ugcresearch.userId, user.user.id) });
        return ugcList.length;
    } catch (e) {
        console.error("error getting user ugc stats", e);
    }
}
