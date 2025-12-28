"use server"

import type { AddArtistResp } from "@/server/utils/queries/artistQueries";

export async function addArtist(spotifyId: string): Promise<AddArtistResp> {
    return { status: "error", message: "Authentication disabled" };
} 