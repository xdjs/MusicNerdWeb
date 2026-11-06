import { useCallback, useReducer, useRef } from "react";

export type TurnOutcome = "running" | "stopped" | "failed" | "finished";
export type TurnAttempt = { questionId: string; attempt: number };
export type TurnState = Record<
  string,
  { attempt: number; outcome: TurnOutcome }
>;
export type TurnEvent = TurnAttempt & { outcome: TurnOutcome };

/** Terminal states belong to a question AND attempt, never to the last render. */
export function turnReducer(state: TurnState, event: TurnEvent): TurnState {
  const previous = state[event.questionId];
  if (
    previous &&
    (event.attempt < previous.attempt ||
      (event.attempt === previous.attempt && previous.outcome !== "running"))
  )
    return state;
  return {
    ...state,
    [event.questionId]: { attempt: event.attempt, outcome: event.outcome },
  };
}

export function useTurnLifecycle() {
  const [turns, dispatch] = useReducer(turnReducer, {});
  const [pending, setPending] = useReducer(
    (_old: boolean, next: boolean) => next,
    false,
  );
  const sequence = useRef(0);
  const active = useRef<TurnAttempt | null>(null);
  const record = useCallback((outcome: Exclude<TurnOutcome, "running">) => {
    if (active.current) dispatch({ ...active.current, outcome });
  }, []);
  const run = useCallback(
    async (questionId: string, operation: () => Promise<unknown>) => {
      // ai 7 invokes onError/onFinish before the send/regenerate promise settles.
      // Keep this lock through that finally block, including after Stop. Thus a
      // callback cannot be attributed to a newer attempt (callbacks carry no ID).
      if (active.current) return;
      const token = { questionId, attempt: ++sequence.current };
      active.current = token;
      dispatch({ ...token, outcome: "running" });
      setPending(true);
      try {
        await operation();
        dispatch({ ...token, outcome: "finished" });
      } catch {
        dispatch({ ...token, outcome: "failed" });
      } finally {
        if (active.current === token) {
          active.current = null;
          setPending(false);
        }
      }
    },
    [],
  );
  return {
    turns,
    pending,
    run,
    record,
    isPending: () => active.current !== null,
  };
}
