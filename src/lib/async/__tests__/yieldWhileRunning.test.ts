import { yieldWhileRunning } from "@/lib/async/yieldWhileRunning";

async function drain<D, T>(gen: AsyncGenerator<D, T>): Promise<{ yielded: D[]; returned: T }> {
    const yielded: D[] = [];
    for (;;) {
        const step = await gen.next();
        if (step.done) return { yielded, returned: step.value };
        yielded.push(step.value);
    }
}

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

describe("yieldWhileRunning", () => {
    it("yields what the task emits, in order, then returns its result", async () => {
        const { yielded, returned } = await drain(yieldWhileRunning<string, number>(async emit => {
            emit("a");
            await tick();
            emit("b");
            await tick();
            emit("c");
            return 42;
        }));
        expect(yielded).toEqual(["a", "b", "c"]);
        expect(returned).toBe(42);
    });

    it("yields each value while the task is still running, not after it settles", async () => {
        let finish!: (v: string) => void;
        const gen = yieldWhileRunning<string, string>(emit => {
            emit("first");
            return new Promise(resolve => { finish = resolve; });
        });
        await expect(gen.next()).resolves.toEqual({ value: "first", done: false });
        finish("done");
        await expect(gen.next()).resolves.toEqual({ value: "done", done: true });
    });

    it("yields everything emitted before a failure, then rethrows the task's error", async () => {
        const boom = new Error("Gemini timeout");
        const gen = yieldWhileRunning<string, never>(async emit => {
            emit("partial");
            await tick();
            throw boom;
        });
        await expect(gen.next()).resolves.toEqual({ value: "partial", done: false });
        await expect(gen.next()).rejects.toBe(boom);
    });

    it("returns straight away when the task emits nothing", async () => {
        const { yielded, returned } = await drain(yieldWhileRunning<string, string>(async () => "quiet"));
        expect(yielded).toEqual([]);
        expect(returned).toBe("quiet");
    });

    it("never leaves a rejection unhandled while nobody is awaiting the task", async () => {
        const unhandled = jest.fn();
        process.on("unhandledRejection", unhandled);
        try {
            const gen = yieldWhileRunning<string, never>(async emit => {
                emit("x");
                throw new Error("late");
            });
            await gen.next();
            // The task has already failed; give Node a chance to report it before we ask again.
            await tick();
            await tick();
            await expect(gen.next()).rejects.toThrow("late");
            expect(unhandled).not.toHaveBeenCalled();
        } finally {
            process.off("unhandledRejection", unhandled);
        }
    });
});
