import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/server/auth";
import { getDevSession } from "@/server/utils/dev-auth";
import { getApprovedClaimByUserId } from "@/server/utils/queries/dashboardQueries";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { db } from "@/server/db/drizzle";
import { artists } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function POST(req: Request) {
    const session = await getServerAuthSession() ?? await getDevSession();
    if (!session) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    try {
        const claim = await getApprovedClaimByUserId(session.user.id);
        if (!claim) {
            return NextResponse.json({ error: "No claimed artist profile" }, { status: 403 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const artistId = formData.get("artistId") as string | null;

        if (!file || !artistId) {
            return NextResponse.json({ error: "File and artistId are required" }, { status: 400 });
        }

        if (claim.artistId !== artistId) {
            return NextResponse.json({ error: "Not authorized for this artist" }, { status: 403 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: "Image too large (max 5MB)" }, { status: 400 });
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: "Only PNG, JPEG, and WebP images are supported" },
                { status: 400 }
            );
        }

        const uploadDir = path.join(process.cwd(), "public", "artist-images");
        await mkdir(uploadDir, { recursive: true });

        const ext = path.extname(file.name) || `.${file.type.split("/")[1]}`;
        const uniqueName = `${artistId}_${Date.now()}${ext}`;
        const filePath = path.join(uploadDir, uniqueName);
        const publicPath = `/artist-images/${uniqueName}`;

        const bytes = await file.arrayBuffer();
        await writeFile(filePath, Buffer.from(bytes));

        // Update the artist record with the custom image path
        await db
            .update(artists)
            .set({ customImage: publicPath })
            .where(eq(artists.id, artistId));

        return NextResponse.json({ success: true, imagePath: publicPath });
    } catch (error) {
        console.error("[artist/profile-image] Error:", error);
        return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
    }
}
