import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/server/auth";
import { getDevSession } from "@/server/utils/dev-auth";
import { getApprovedClaimByUserId } from "@/server/utils/queries/dashboardQueries";
import { insertVaultSource } from "@/server/utils/queries/dashboardQueries";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
    "application/pdf",
    "text/plain",
    "text/markdown",
    "text/csv",
    "application/json",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/png",
    "image/jpeg",
    "image/webp",
    "audio/mpeg",
    "audio/wav",
];

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
            return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: `File type not supported: ${file.type}. Supported: PDF, TXT, MD, CSV, JSON, DOCX, images, audio.` },
                { status: 400 }
            );
        }

        // Create artist-specific upload directory
        const uploadDir = path.join(process.cwd(), "public", "vault-uploads", artistId);
        await mkdir(uploadDir, { recursive: true });

        // Generate unique filename
        const ext = path.extname(file.name);
        const baseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
        const uniqueName = `${baseName}_${Date.now()}${ext}`;
        const filePath = path.join(uploadDir, uniqueName);
        const publicPath = `/vault-uploads/${artistId}/${uniqueName}`;

        // Write file
        const bytes = await file.arrayBuffer();
        await writeFile(filePath, Buffer.from(bytes));

        // Extract text content for LLM access
        let extractedText: string | undefined;
        if (file.type === "text/plain" || file.type === "text/markdown" || file.type === "text/csv") {
            extractedText = new TextDecoder().decode(bytes);
        } else if (file.type === "application/json") {
            extractedText = new TextDecoder().decode(bytes);
        }

        // Insert vault source record
        const source = await insertVaultSource({
            artistId,
            url: publicPath,
            title: file.name,
            snippet: extractedText ? extractedText.slice(0, 300) : `Uploaded file: ${file.name} (${formatFileSize(file.size)})`,
            type: getSourceType(file.type),
            status: "approved",
            fileName: file.name,
            fileSize: file.size,
            filePath: publicPath,
            contentType: file.type,
            extractedText: extractedText ?? null,
        });

        return NextResponse.json({ success: true, source });
    } catch (error) {
        console.error("[vault/upload] Error:", error);
        return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }
}

function getSourceType(mimeType: string): string {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType === "application/pdf") return "document";
    if (mimeType.includes("word")) return "document";
    if (mimeType === "text/plain" || mimeType === "text/markdown") return "document";
    if (mimeType === "text/csv" || mimeType === "application/json") return "data";
    return "file";
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
