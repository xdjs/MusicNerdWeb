/**
 * Runs `task`, yielding each value it hands to `emit` while it runs, then returns
 * what the task resolved to, or rethrows what it rejected with.
 *
 * A generator cannot `yield` from inside a callback, so a call that reports
 * progress through one (a model call's `onTextDelta`) cannot feed an async
 * generator directly. This is the bridge: `const doc = yield* yieldWhileRunning(...)`.
 *
 * The task's outcome is captured the moment it settles, so a rejection that lands
 * while the caller is still consuming earlier values is never reported as unhandled.
 */
export async function* yieldWhileRunning<D, T>(task: (emit: (value: D) => void) => Promise<T>): AsyncGenerator<D, T> {
    const queue: D[] = [];
    let wake: (() => void) | null = null;
    const notify = () => { wake?.(); wake = null; };

    let outcome: { ok: true; value: T } | { ok: false; error: unknown } | null = null;
    const settled = task(value => { queue.push(value); notify(); }).then(
        value => { outcome = { ok: true, value }; notify(); },
        error => { outcome = { ok: false, error }; notify(); },
    );

    for (;;) {
        while (queue.length > 0) yield queue.shift() as D;
        if (outcome) break;
        await new Promise<void>(resolve => { wake = resolve; });
    }
    await settled;
    const done = outcome as { ok: true; value: T } | { ok: false; error: unknown };
    if (!done.ok) throw done.error;
    return done.value;
}
