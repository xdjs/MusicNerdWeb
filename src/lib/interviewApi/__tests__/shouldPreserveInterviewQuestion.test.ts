import { shouldPreserveInterviewQuestion } from "../shouldPreserveInterviewQuestion";
import type { interviewCheckSchema } from "../interviewPlanSchemas";

type Check = ReturnType<typeof interviewCheckSchema.parse>;
const rejectedAngle: Check = {
  premiseAudit: {
    coverage: {
      question: true,
      observation: true,
      intendedUnknown: true,
      rationale: true,
      connection: true,
    },
    question: [
      {
        premise: "The quartet recorded in the same room.",
        status: "supported",
        reason: "The session note establishes the shared room.",
      },
    ],
    angle: [
      {
        premise: "They managed microphone spill.",
        status: "unsupported",
        reason:
          "The shared-room note does not establish spill or its management.",
      },
    ],
  },
  supported: false,
  timeScopeSupported: true,
  faithfulToLatestAnswer: true,
  respectsBoundaries: true,
  novelAgainstHistory: true,
  oneClearAsk: true,
  reason: "The question is open; the intended unknown adds spill.",
};

it("preserves an audited question when only its angle has an unsupported premise", () => {
  expect(shouldPreserveInterviewQuestion(rejectedAngle)).toBe(true);
});

it("requires an explicit angle defect even when the general support flag is false", () => {
  expect(
    shouldPreserveInterviewQuestion({
      ...rejectedAngle,
      premiseAudit: { ...rejectedAngle.premiseAudit, angle: [] },
    }),
  ).toBe(false);
});

it("preserves an audited question when an angle qualification is missing", () => {
  expect(
    shouldPreserveInterviewQuestion({
      ...rejectedAngle,
      premiseAudit: {
        ...rejectedAngle.premiseAudit,
        angle: [
          {
            ...rejectedAngle.premiseAudit.angle[0],
            status: "missing_qualification",
          },
        ],
      },
    }),
  ).toBe(true);
});

it.each(["observation", "intendedUnknown", "rationale", "connection"] as const)(
  "preserves a completely audited question while an incomplete %s is repaired",
  (field) => {
    expect(
      shouldPreserveInterviewQuestion({
        ...rejectedAngle,
        supported: true,
        premiseAudit: {
          ...rejectedAngle.premiseAudit,
          angle: [],
          coverage: {
            ...rejectedAngle.premiseAudit.coverage,
            [field]: false,
          },
        },
      }),
    ).toBe(true);
  },
);

it("does not preserve an incompletely audited question", () => {
  expect(
    shouldPreserveInterviewQuestion({
      ...rejectedAngle,
      premiseAudit: {
        ...rejectedAngle.premiseAudit,
        coverage: { ...rejectedAngle.premiseAudit.coverage, question: false },
      },
    }),
  ).toBe(false);
});

it.each(["unsupported", "missing_qualification"] as const)(
  "allows rewriting a question with a %s premise as well as an angle defect",
  (status) => {
    expect(
      shouldPreserveInterviewQuestion({
        ...rejectedAngle,
        premiseAudit: {
          ...rejectedAngle.premiseAudit,
          question: [{ ...rejectedAngle.premiseAudit.question[0], status }],
        },
      }),
    ).toBe(false);
  },
);

it.each([
  "timeScopeSupported",
  "faithfulToLatestAnswer",
  "respectsBoundaries",
  "novelAgainstHistory",
  "oneClearAsk",
] as const)("allows rewriting when %s fails", (field) => {
  expect(
    shouldPreserveInterviewQuestion({ ...rejectedAngle, [field]: false }),
  ).toBe(false);
});

it("does not preserve a mechanically rejected and unaudited question", () => {
  expect(
    shouldPreserveInterviewQuestion({
      ...rejectedAngle,
      premiseAudit: {
        coverage: {
          question: false,
          observation: false,
          intendedUnknown: false,
          rationale: false,
          connection: false,
        },
        question: [],
        angle: [],
      },
      oneClearAsk: false,
    }),
  ).toBe(false);
});

it("can preserve a fully audited open question with no factual presuppositions", () => {
  expect(
    shouldPreserveInterviewQuestion({
      ...rejectedAngle,
      premiseAudit: { ...rejectedAngle.premiseAudit, question: [] },
    }),
  ).toBe(true);
});
