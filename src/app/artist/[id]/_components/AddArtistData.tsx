// Stub component - authentication disabled
import { Artist, UrlMap } from "@/server/db/DbTypes";

export default function AddArtistData({
  label,
  artist,
  spotifyImg,
  availableLinks,
  isOpenOnLoad,
}: {
  label: string;
  artist: Artist;
  spotifyImg: string;
  availableLinks: UrlMap[];
  isOpenOnLoad: boolean;
}) {
  return null;
}
