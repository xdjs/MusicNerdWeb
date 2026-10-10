import { createHash } from "node:crypto";
/** Separate new answer-policy registrations without deleting old answers or resetting limits. */
export function getResearchQuestionHash(question: string): string {
  return createHash("sha256").update("public-answer-v2\0").update(question).digest("hex");
}
