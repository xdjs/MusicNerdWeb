import { generateText as sdkGenerateText, type Output, type OutputInterface } from "ai";
import { google } from "@ai-sdk/google";
import { MODEL_DEFAULT, MODEL_GROUNDED } from "@/server/lib/ai/models";

type TextOutput = ReturnType<typeof Output.text>;

export type GenerateTextOptions<OUTPUT extends OutputInterface = TextOutput> = {
    /** Gateway model id. Defaults to `MODEL_DEFAULT`, or `MODEL_GROUNDED` when `googleSearch` is set. */
    model?: string;
    /** The system instruction, unchanged from the Gemini call it replaces. */
    instructions?: string;
    prompt: string;
    temperature?: number;
    /** Thinking budget in tokens; 0 turns reasoning off. Gemini takes the number as its
     *  thinking budget; other providers get the SDK reasoning level (`none` for 0, `low`
     *  otherwise). Omitted means the provider's default. */
    thinkingBudget?: number;
    /** `Output.object({ schema })` or `Output.array({ element })` for the sites that parse JSON today. */
    output?: OUTPUT;
    /** Google Search grounding, executed by the provider; the result's `sources` say what it used. */
    googleSearch?: boolean;
};

/** The one entry point for model calls. Routes through Vercel AI Gateway (docs/llm.md).
 *  Logs one line per call with timing, tokens and the gateway generation id, which is
 *  what a cost lookup needs. */
export async function generateText<OUTPUT extends OutputInterface = TextOutput>(options: GenerateTextOptions<OUTPUT>) {
    const { instructions, prompt, temperature, thinkingBudget, output, googleSearch } = options;
    const model = options.model ?? (googleSearch ? MODEL_GROUNDED : MODEL_DEFAULT);
    const started = Date.now();
    const result = await sdkGenerateText({
        model,
        instructions,
        prompt,
        temperature,
        output,
        ...(googleSearch ? { tools: { google_search: google.tools.googleSearch({}) } } : {}),
        ...reasoningFor(model, thinkingBudget),
    });
    const usage = result.usage;
    const generationId = result.providerMetadata?.gateway?.generationId;
    console.log(`[ai] ${model} ${Date.now() - started}ms in=${usage?.inputTokens ?? "?"} out=${usage?.outputTokens ?? "?"} reasoning=${usage?.outputTokenDetails?.reasoningTokens ?? 0} gen=${typeof generationId === "string" ? generationId : "-"}`);
    return result;
}

/** Gemini takes a token budget; everyone else takes the SDK's reasoning level. */
function reasoningFor(model: string, thinkingBudget: number | undefined) {
    if (thinkingBudget === undefined) return {};
    if (model.startsWith("google/")) return { providerOptions: { google: { thinkingConfig: { thinkingBudget } } } };
    return { reasoning: thinkingBudget === 0 ? "none" : "low" } as const;
}
