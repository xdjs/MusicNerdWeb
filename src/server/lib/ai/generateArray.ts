import { Output } from "ai";
import type { z } from "zod";
import { generateText, type GenerateTextOptions } from "@/server/lib/ai/generateText";

export type GenerateArrayOptions<E> = Omit<GenerateTextOptions, "output"> & {
    /** The shape of each element; `result.output` is an array validated against it. */
    element: z.ZodType<E>;
};

/** A model call whose reply is a list of the given element shape (docs/llm.md). */
export function generateArray<E>({ element, ...options }: GenerateArrayOptions<E>) {
    return generateText({ ...options, output: Output.array({ element }) });
}
