import { ARTIST_ROW_PROPERTY_BY_COLUMN } from "@/server/db/artistRowProperties";
export function getArtistLinkValue(artist: object, columnName: string): string | null {
  const propertyName = ARTIST_ROW_PROPERTY_BY_COLUMN[columnName] ?? columnName;
  return ((artist as Record<string, unknown>)[propertyName] as string | null | undefined) ?? null;
}

