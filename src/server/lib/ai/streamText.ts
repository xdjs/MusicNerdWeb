import { streamText as sdkStreamText } from "ai";
import { MODEL_FLASH } from "@/server/lib/ai/models";
import type { GenerateTextOptions } from "@/server/lib/ai/generateText";

export type StreamTextOptions = Omit<GenerateTextOptions, "output" | "googleSearch"> & {
    /** Called with each piece of text as the model writes it. */
    onTextDelta?: (delta: string) => void;
};

/**
 * `generateText` for a site whose text is shown while it is written (docs/llm.md,
 * "Streaming into the build popup"). Resolves `{ text }` once the stream ends, so a
 * site swaps it in without changing how it reads the reply.
 *
 * `ai`'s streamText never throws: a failed request arrives as an `error` part.
 * Rethrowing it keeps the contract `generateText` had, where the call rejects and
 * the site's own catch or timeout decides what happens.
 */
export async function streamText(options: StreamTextOptions): Promise<{ text: string }> {
    const { model = MODEL_FLASH, instructions, prompt, temperature, thinkingBudget, onTextDelta } = options;
    const result = sdkStreamText({
        model,
        instructions,
        prompt,
        temperature,
        ...(thinkingBudget !== undefined ? { providerOptions: { google: { thinkingConfig: { thinkingBudget } } } } : {}),
    });
    let text = "";
    for await (const part of result.fullStream) {
        if (part.type === "text-delta") {
            text += part.text;
            onTextDelta?.(part.text);
        } else if (part.type === "error") {
            throw part.error;
        }
    }
    return { text };
}
