/** Display provider records without exposing storage metadata or inventing missing facts. */
export function formatLatestSourceDetails(
  sourceId: string,
  text: string,
): { label: string; value: string }[] | null {
  const provider = sourceId.split(":")[1];
  if (
    !sourceId.startsWith("latest:") ||
    !["spotify", "deezer", "inprocess"].includes(provider)
  )
    return null;
  let record: Record<string, unknown>;
  try {
    record = JSON.parse(text);
  } catch {
    return null;
  }
  if (
    !record ||
    Array.isArray(record) ||
    record.provider !== provider ||
    typeof record.title !== "string"
  )
    return null;
  const rows = [{ label: "Title", value: record.title }];
  if (provider === "inprocess") {
    if (typeof record.collection_name === "string" && record.collection_name)
      rows.push({ label: "Collection", value: record.collection_name });
    if (typeof record.description === "string" && record.description)
      rows.push({ label: "Description", value: record.description });
  } else if (typeof record.release_type === "string") {
    const types: Record<string, string> = {
      album: "Album",
      single: "Single",
      ep: "EP",
      compilation: "Compilation",
    };
    if (Object.prototype.hasOwnProperty.call(types, record.release_type))
      rows.push({ label: "Type", value: types[record.release_type] });
  }
  const rawDate =
    provider === "inprocess" ? record.created_at : record.release_date;
  if (typeof rawDate === "string") {
    const value = provider === "inprocess" ? rawDate.slice(0, 10) : rawDate;
    if (/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(value)) {
      const complete =
        value.length === 4
          ? `${value}-01-01`
          : value.length === 7
            ? `${value}-01`
            : value;
      const date = new Date(`${complete}T00:00:00Z`);
      if (
        Number.isFinite(date.getTime()) &&
        date.toISOString().startsWith(complete)
      ) {
        const display = new Intl.DateTimeFormat("en-US", {
          timeZone: "UTC",
          year: "numeric",
          ...(value.length >= 7 ? { month: "long" } : {}),
          ...(value.length === 10 ? { day: "numeric" } : {}),
        } as Intl.DateTimeFormatOptions).format(date);
        rows.push({
          label: provider === "inprocess" ? "Posted" : "Released",
          value: display,
        });
      }
    }
  }
  return rows;
}
