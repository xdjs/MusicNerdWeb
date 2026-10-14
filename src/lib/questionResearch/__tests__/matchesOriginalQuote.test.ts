import { matchesOriginalQuote } from "../matchesOriginalQuote";

const original =
  "I have been quietly building it out  over the past year\n\nto escape platform dependency & create a direct connection.";

test("accepts whitespace changes within one contiguous original passage", () => {
  expect(
    matchesOriginalQuote(
      original,
      "quietly building it out over the past year to escape platform dependency & create a direct connection",
    ),
  ).toBe(true);
  expect(
    matchesOriginalQuote(
      original,
      "building it out\n over the past year to escape platform dependency",
    ),
  ).toBe(true);
});

test("rejects altered meaning, punctuation, case and stitched text", () => {
  expect(
    matchesOriginalQuote(original, "building it out to create a direct connection"),
  ).toBe(false);
  expect(
    matchesOriginalQuote(
      original,
      "building it out over the past year to avoid platform dependency",
    ),
  ).toBe(false);
  expect(
    matchesOriginalQuote(
      original,
      "building it out over the past year to escape platform dependency and create",
    ),
  ).toBe(false);
  expect(
    matchesOriginalQuote(
      original,
      "Building it out over the past year to escape platform dependency",
    ),
  ).toBe(false);
  expect(
    matchesOriginalQuote(original, "not building it out over the past year"),
  ).toBe(false);
});

test("matches decoded structured-record values without changing their wording", () => {
  const record = JSON.stringify({ title: 'A "quoted" title', description: 'First line\nSecond line about music.' });
  expect(matchesOriginalQuote(record, 'A "quoted" title', true)).toBe(true);
  expect(matchesOriginalQuote(record, 'First line Second line about music.', true)).toBe(true);
  expect(matchesOriginalQuote(record, 'A "quoted" title First line', true)).toBe(false);
  expect(matchesOriginalQuote(record, 'First line about music.', true)).toBe(false);
  expect(matchesOriginalQuote(record, 'A "quoted" title')).toBe(false);
});

test("does not repair malformed JSON or reinterpret ordinary text", () => {
  expect(matchesOriginalQuote('{"title":"A \\"quoted\\" title"', 'A "quoted" title', true)).toBe(false);
  expect(matchesOriginalQuote('A \\"quoted\\" title', 'A "quoted" title', true)).toBe(false);
});
