/** @jest-environment node */
import { createHash } from "node:crypto";
import { getResearchQuestionHash } from "../getResearchQuestionHash";
it("keeps the exact question stable within a policy and separates old answer fingerprints", () => {
  const question = "What's new?";
  expect(getResearchQuestionHash(question)).toBe(getResearchQuestionHash(question));
  expect(getResearchQuestionHash(question)).not.toBe(createHash("sha256").update(question).digest("hex"));
  expect(getResearchQuestionHash(question)).not.toBe(getResearchQuestionHash("What else?"));
});
