"use server"

import { addArtist as addArtistQuery, type AddArtistResp } from "@/server/utils/queries/artistQueries";

export async function addArtist(spotifyId: string): Promise<AddArtistResp> {
    return addArtistQuery(spotifyId);
} 