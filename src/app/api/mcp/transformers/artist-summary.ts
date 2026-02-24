import { Artist } from "@/server/db/DbTypes";
import { ArtistSummary } from "../types";

export function toArtistSummary(artist: Artist): ArtistSummary {
  return {
    id: artist.id,
    name: artist.name ?? "",
  };
}
