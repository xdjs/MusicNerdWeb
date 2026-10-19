import { createHash } from "node:crypto";

/** Historical request hash used only to bind legacy job records. */
export function legacyQuestionHash(question: string): string {
  return createHash("sha256").update(question).digest("hex");
}
