import { resolveQuestionDate } from "../resolveQuestionDate";
it.each([
  ["In the October 7 caption, which versions do listeners choose between?", "2026-10-13", "2026-10-07"],
  ["What did the December 31 post say?", "2026-01-02", "2025-12-31"],
  ["What did the October 7, 2023 post say?", "2026-10-13", "2023-10-07"],
  ["Compare October 7 and October 8", "2026-10-13", undefined],
  ["What happened October 7–9?", "2026-10-13", undefined],
  ["What happened in 2020 on October 7?", "2026-10-13", undefined],
  ["What is planned next October 7?", "2026-10-13", undefined],
  ["What happened February 30?", "2026-10-13", undefined],
])("resolves only an unambiguous past calendar day: %s", (question, now, expected) => {
  expect(resolveQuestionDate(question, now)).toBe(expected);
});
