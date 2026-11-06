import { expect, it } from "@jest/globals";
import { turnReducer, type TurnState } from "../useTurnLifecycle";

it.each(["stopped", "failed"] as const)(
  "retains earlier %s outcome when a new question starts",
  (outcome) => {
    let state: TurnState = {};
    state = turnReducer(state, {
      questionId: "q1",
      attempt: 1,
      outcome: "running",
    });
    state = turnReducer(state, { questionId: "q1", attempt: 1, outcome });
    state = turnReducer(state, {
      questionId: "q2",
      attempt: 2,
      outcome: "running",
    });
    expect(state.q1.outcome).toBe(outcome);
  },
);

it("retry invalidates old completion and ignores all late events from prior attempt", () => {
  let state = turnReducer(
    {},
    { questionId: "q1", attempt: 1, outcome: "finished" },
  );
  state = turnReducer(state, {
    questionId: "q1",
    attempt: 2,
    outcome: "running",
  });
  for (const outcome of ["finished", "failed", "stopped", "running"] as const) {
    const next = turnReducer(state, { questionId: "q1", attempt: 1, outcome });
    expect(next).toBe(state);
  }
  expect(state.q1).toEqual({ attempt: 2, outcome: "running" });
});

it("SDK completion cannot overwrite Stop or failure in the same attempt", () => {
  for (const outcome of ["stopped", "failed"] as const) {
    const state = turnReducer({}, { questionId: "q1", attempt: 1, outcome });
    expect(
      turnReducer(state, { questionId: "q1", attempt: 1, outcome: "finished" }),
    ).toBe(state);
  }
});
