import type { interviewCheckSchema } from "./interviewPlanSchemas";

/** A failed angle can be repaired without replacing an otherwise audited question. */
export function shouldPreserveInterviewQuestion(
  verdict: ReturnType<typeof interviewCheckSchema.parse>,
): boolean {
  const { coverage, question, angle } = verdict.premiseAudit;
  const angleFailed =
    !coverage.observation ||
    !coverage.intendedUnknown ||
    !coverage.rationale ||
    !coverage.connection ||
    angle.some((item) => item.status !== "supported");

  return (
    angleFailed &&
    coverage.question &&
    question.every((item) => item.status === "supported") &&
    verdict.timeScopeSupported &&
    verdict.faithfulToLatestAnswer &&
    verdict.respectsBoundaries &&
    verdict.novelAgainstHistory &&
    verdict.oneClearAsk
  );
}
