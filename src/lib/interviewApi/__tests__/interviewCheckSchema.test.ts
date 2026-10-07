/** @jest-environment node */
import { interviewCheckSchema } from "../interviewPlanSchemas";
const globals = {
  supported: true,
  timeScopeSupported: true,
  faithfulToLatestAnswer: true,
  respectsBoundaries: true,
  novelAgainstHistory: true,
  oneClearAsk: true,
  reason: "All factual premises audited.",
};
const item = {
  premise: "The artist used a drum machine.",
  status: "supported",
  reason: "The exact answer names a drum machine.",
};
const audit = {
  coverage: {
    question: true,
    observation: true,
    intendedUnknown: true,
    rationale: true,
    connection: true,
  },
  question: [item],
  angle: [item],
};
it("requires separate question and angle audits plus explicit coverage of every angle field", () => {
  expect(interviewCheckSchema.safeParse(globals).success).toBe(false);
  for (const missing of ["question", "angle", "coverage"]) {
    const incomplete: Record<string, unknown> = { ...audit };
    delete incomplete[missing];
    expect(
      interviewCheckSchema.safeParse({ ...globals, premiseAudit: incomplete })
        .success,
    ).toBe(false);
  }
  for (const missing of Object.keys(audit.coverage)) {
    const coverage: Record<string, unknown> = { ...audit.coverage };
    delete coverage[missing];
    expect(
      interviewCheckSchema.safeParse({
        ...globals,
        premiseAudit: { ...audit, coverage },
      }).success,
    ).toBe(false);
  }
});
it("bounds the audit to eight compact items and rejects unsupported status labels", () => {
  expect(
    interviewCheckSchema.safeParse({
      ...globals,
      premiseAudit: {
        ...audit,
        question: Array(4).fill(item),
        angle: Array(4).fill(item),
      },
    }).success,
  ).toBe(true);
  for (const invalid of [
    { ...audit, question: Array(5).fill(item) },
    { ...audit, angle: Array(5).fill(item) },
    { ...audit, question: [{ ...item, premise: "x".repeat(121) }] },
    { ...audit, angle: [{ ...item, reason: "x".repeat(161) }] },
    { ...audit, angle: [{ ...item, status: "probably_supported" }] },
  ])
    expect(
      interviewCheckSchema.safeParse({ ...globals, premiseAudit: invalid })
        .success,
    ).toBe(false);
});
