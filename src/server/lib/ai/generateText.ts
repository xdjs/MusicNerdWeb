import { generateText as sdkGenerateText, type Output, type OutputInterface } from "ai";
import { google } from "@ai-sdk/google";
import { MODEL_FLASH } from "@/server/lib/ai/models";

type TextOutput = ReturnType<typeof Output.text>;

export type GenerateTextOptions<OUTPUT extends OutputInterface = TextOutput> = {
    /** Gateway model id; defaults to flash. */
    model?: string;
    /** The system instruction, unchanged from the Gemini call it replaces. */
    instructions?: string;
    prompt: string;
    temperature?: number;
    /** Gemini thinking budget in tokens; omitted means the model's default. */
    thinkingBudget?: number;
    /** `Output.object({ schema })` or `Output.array({ element })` for the sites that parse JSON today. */
    output?: OUTPUT;
    /** Google Search grounding, executed by the provider; the result's `sources` say what it used. */
    googleSearch?: boolean;
};

/** The one entry point for model calls. Routes through Vercel AI Gateway (docs/llm.md). */
export function generateText<OUTPUT extends OutputInterface = TextOutput>(options: GenerateTextOptions<OUTPUT>) {
    const { model = MODEL_FLASH, instructions, prompt, temperature, thinkingBudget, output, googleSearch } = options;
    return sdkGenerateText({
        model,
        instructions,
        prompt,
        temperature,
        output,
        ...(googleSearch ? { tools: { google_search: google.tools.googleSearch({}) } } : {}),
        ...(thinkingBudget !== undefined ? { providerOptions: { google: { thinkingConfig: { thinkingBudget } } } } : {}),
    });
}
