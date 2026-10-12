import { formatLatestSourceDetails } from "../formatLatestSourceDetails";
const id = "latest:deezer:abc";
it("shows release details, never provider account or internal IDs", () => {
  expect(
    formatLatestSourceDetails(
      id,
      JSON.stringify({
        provider: "deezer",
        artist_account: "63751082",
        id: "799871131",
        title: "Trend to Zero",
        release_type: "ep",
        release_date: "2025-08-08",
      }),
    ),
  ).toEqual([
    { label: "Title", value: "Trend to Zero" },
    { label: "Type", value: "EP" },
    { label: "Released", value: "August 8, 2025" },
  ]);
});
it.each([
  ["2025", "2025"],
  ["2025-08", "August 2025"],
])("retains date precision for %s", (date, display) => {
  expect(
    formatLatestSourceDetails(
      id,
      JSON.stringify({
        provider: "deezer",
        title: "Release",
        release_date: date,
      }),
    ),
  ).toContainEqual({ label: "Released", value: display });
});
it("labels InProcess date as posted and preserves its description", () => {
  expect(
    formatLatestSourceDetails(
      "latest:inprocess:abc",
      JSON.stringify({
        provider: "inprocess",
        title: "Plugin designs",
        collection_name: "Experiments",
        description: "Trying new looks.",
        created_at: "2026-10-08T23:30:00Z",
      }),
    ),
  ).toEqual([
    { label: "Title", value: "Plugin designs" },
    { label: "Collection", value: "Experiments" },
    { label: "Description", value: "Trying new looks." },
    { label: "Posted", value: "October 8, 2026" },
  ]);
});
it.each([
  '{"provider":',
  "null",
  "[]",
  '{"provider":"spotify","title":"Wrong"}',
])("fails closed for incomplete or mismatched records", (text) =>
  expect(formatLatestSourceDetails(id, text)).toBeNull(),
);
it("does not invent a day or normalize an invalid date", () =>
  expect(
    formatLatestSourceDetails(
      id,
      '{"provider":"deezer","title":"Release","release_date":"2025-02-31"}',
    ),
  ).toEqual([{ label: "Title", value: "Release" }]));

it("omits unknown release types including object property names", () => {
  expect(
    formatLatestSourceDetails(
      id,
      JSON.stringify({
        provider: "deezer",
        title: "Release",
        release_type: "constructor",
      }),
    ),
  ).toEqual([{ label: "Title", value: "Release" }]);
});
